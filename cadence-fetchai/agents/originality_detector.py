from __future__ import annotations

import asyncio
import json
import logging
import os
import re

from browser_use_sdk import AsyncBrowserUse
from uagents import Agent, Context, Protocol

from protocols.messages import DetectRequest, DetectResult

log = logging.getLogger("cadence.originality")

TASK_TIMEOUT = 600
MAX_RETRIES = 2

TASK_TEMPLATE = (
    "Close any popups or cookie banners first.\n"
    "Find the text input area and click it.\n"
    "Type the text below into the text area.\n"
    "Click the scan/check button.\n"
    "Wait for results to load.\n"
    "Read the result on the right side. CRITICAL: The score says something like "
    "'X% confident this is original' or 'X% confident this is AI-generated'. "
    "You MUST pay attention to whether it says ORIGINAL or AI. "
    "If it says '97% original', that means AI Score is 3% (100 minus 97). "
    "If it says '97% AI-generated' or '97% not original', that means AI Score is 97%. "
    "Always report the AI percentage, NOT the original percentage.\n"
    "IMPORTANT NEXT STEP: You are NOT done yet. After reading the score, "
    "scroll DOWN through the results. Look for sentences with colored backgrounds:\n"
    "  GREEN = human (skip)\n"
    "  YELLOW/ORANGE = risky (include)\n"
    "  RED/PINK = AI detected (include)\n"
    "Scroll through ALL results. For each non-green sentence, note the first 6 words.\n"
    "Only AFTER scrolling through ALL results, return this format:\n"
    "AI Score: [AI percentage]%\n"
    "Flagged:\n"
    "- [first 6 words of flagged sentence]...\n"
    "If no non-green sentences: Flagged: none\n\n"
    "TEXT:\n\n{text}"
)

_REVERSE_HOMOGLYPHS = {
    "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p",
    "\u0441": "c", "\u0455": "s", "\u0456": "i", "\u0445": "x",
    "\u0410": "A", "\u0415": "E", "\u041e": "O", "\u0420": "P",
    "\u0421": "C", "\u0405": "S", "\u0412": "B", "\u0422": "T",
}


def _clean_text(text: str) -> str:
    for cyrillic, latin in _REVERSE_HOMOGLYPHS.items():
        text = text.replace(cyrillic, latin)
    text = text.replace("\u200b", "")
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ").replace("/n", " ")
    return re.sub(r"\s{2,}", " ", text).strip()


def _split_sentences(text: str) -> list[str]:
    clean = _clean_text(text)
    parts = re.split(r"(?<=[.!?])\s+", clean)
    return [s.strip() for s in parts if s.strip() and len(s.strip()) > 5]


def _match_fragment(fragment: str, sentences: list[str]) -> int | None:
    frag = fragment.lower().strip().rstrip(".")
    frag = frag.rstrip(".").strip()
    words = frag.split()
    if len(words) < 2:
        return None

    best_idx, best_score = None, 0
    for i, sentence in enumerate(sentences):
        s_words = sentence.lower().split()
        match_len = min(len(words), len(s_words))
        matching = sum(1 for a, b in zip(words[:match_len], s_words[:match_len]) if a == b)
        if matching >= 3 and matching > best_score:
            best_score = matching
            best_idx = i
        elif matching < 3 and len(words) >= 3 and frag[:20] in sentence.lower():
            if best_score < 3:
                best_score, best_idx = 3, i
    return best_idx


def _parse_output(raw: str, sentences: list[str]) -> tuple[float, list[int]]:
    score = 0.0
    for m in re.findall(r"(\d{1,3}(?:\.\d+)?)\s*%", raw):
        val = float(m)
        if 0 < val <= 100:
            score = val
            break

    flagged: list[int] = []
    in_flagged = False
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("flagged"):
            if "none" in lower:
                break
            in_flagged = True
            continue
        if in_flagged and line[0] in "-•*":
            fragment = line.lstrip("-•* ").strip().strip("\"'")
            fragment = re.sub(r"\.{2,}$", "", fragment).strip()
            if len(fragment) > 5:
                idx = _match_fragment(fragment, sentences)
                if idx is not None and idx not in flagged:
                    flagged.append(idx)
    return score, flagged


async def _run_once(clean_text: str, sentences: list[str]) -> dict:
    client = AsyncBrowserUse(api_key=os.getenv("BROWSER_USE_API_KEY", ""))
    session_id = None

    try:
        session = await client.sessions.create_session(
            keep_alive=True,
            start_url="https://originality.ai/ai-checker",
        )
        session_id = session.id

        task = await client.tasks.create_task(
            task=TASK_TEMPLATE.format(text=clean_text),
            llm="browser-use-llm",
            session_id=session_id,
        )

        result = await asyncio.wait_for(task.complete(interval=2), timeout=TASK_TIMEOUT)
        raw = result.output or ""
        score, flagged = _parse_output(raw, sentences)
        return {"score": score, "flagged_indices": flagged}

    except asyncio.TimeoutError:
        log.warning("Originality.ai timed out")
        return {"score": 0.0, "flagged_indices": []}
    except Exception as e:
        log.error(f"Originality.ai failed: {e}")
        return {"score": 0.0, "flagged_indices": []}
    finally:
        if session_id:
            try:
                await client.sessions.delete_session(session_id)
            except Exception:
                pass


# ── Agent ──

originality_agent = Agent(
    name="Cadence Originality Detector",
    seed=os.getenv("ORIGINALITY_SEED", "cadence-originality-detector-seed-v1"),
    port=8005,
    endpoint=["http://127.0.0.1:8005/submit"],
    mailbox=True,
    publish_agent_details=True,
    network="testnet",
)

proto = Protocol(name="originality-detector")


@proto.on_message(DetectRequest)
async def handle_detect(ctx: Context, sender: str, msg: DetectRequest):
    ctx.logger.info(f"Originality.ai scanning for session {msg.session_id[:16]}...")

    clean_text = _clean_text(msg.draft_text)
    sentences = _split_sentences(msg.draft_text)

    result = {"score": 0.0, "flagged_indices": []}
    for attempt in range(1, MAX_RETRIES + 1):
        result = await _run_once(clean_text, sentences)
        if result["score"] > 0:
            break
        if attempt < MAX_RETRIES:
            ctx.logger.info(f"Attempt {attempt} got score 0, retrying...")

    flagged_texts = [sentences[i] for i in result["flagged_indices"] if i < len(sentences)]

    ctx.logger.info(f"Originality done: {result['score']:.1f}%, {len(flagged_texts)} flagged")
    await ctx.send(
        sender,
        DetectResult(
            detector_name="Originality.ai",
            ai_score=result["score"],
            flagged_sentences_json=json.dumps(flagged_texts),
            session_id=msg.session_id,
        ),
    )


originality_agent.include(proto, publish_manifest=True)
