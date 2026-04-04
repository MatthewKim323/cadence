from __future__ import annotations
import asyncio
import logging
import os
import re

from browser_use_sdk import AsyncBrowserUse

log = logging.getLogger("cadence")

DETECTORS = [
    {
        "name": "copyleaks",
        "label": "Copyleaks",
        "start_url": "https://copyleaks.com/ai-content-detector",
        "task_template": (
            "You are on the Copyleaks AI Content Detector page. "
            "Find the text input area or text box on this page. "
            "IMPORTANT: Do NOT type the text character by character. Instead, click the text input area, "
            "then use Ctrl+A to select all existing text, then use clipboard paste (Ctrl+V) to paste the text below. "
            "The text has already been placed in your clipboard. "
            "After pasting, click the button to scan/check/detect. "
            "Wait for the results to fully load — this may take 10-30 seconds. "
            "Scroll down to see all results if needed. "
            "Extract the AI probability or AI detection percentage. "
            "IMPORTANT: Look for any sentences that are highlighted or color-coded as AI-generated. "
            "Extract EVERY flagged/highlighted sentence exactly as written. "
            "If no sentences are individually flagged, return an empty list for flagged_sentences. "
            "\n\nTEXT TO PASTE AND CHECK:\n{text}"
        ),
    },
    {
        "name": "zerogpt",
        "label": "ZeroGPT",
        "start_url": "https://www.zerogpt.com",
        "task_template": (
            "You are on ZeroGPT. "
            "Find the large text input area on this page. "
            "IMPORTANT: Do NOT type the text character by character. Instead, click the text area, "
            "then use Ctrl+A to select all, then use clipboard paste (Ctrl+V) to paste the text below. "
            "The text has already been placed in your clipboard. "
            "After pasting, find and click the 'Detect Text' button. "
            "Wait for results to fully load. "
            "CRITICAL: After results appear, SCROLL DOWN on the page to see the full results section. "
            "The AI detection percentage is shown below the input area. "
            "Extract the AI-generated percentage (e.g. '85.67% AI GPT'). "
            "IMPORTANT: ZeroGPT highlights AI-detected sentences in yellow or a different color. "
            "Scroll through the entire results area. "
            "Extract EVERY sentence that ZeroGPT highlighted/marked as AI-generated, "
            "copying the exact text of each flagged sentence. "
            "\n\nTEXT TO PASTE AND CHECK:\n{text}"
        ),
    },
    {
        "name": "originality",
        "label": "Originality.ai",
        "start_url": "https://originality.ai/ai-checker",
        "task_template": (
            "You are on the Originality.ai free AI checker page. "
            "Find the text input area. "
            "IMPORTANT: Do NOT type the text character by character. Instead, click the text area, "
            "then use Ctrl+A to select all, then use clipboard paste (Ctrl+V) to paste the text below. "
            "The text has already been placed in your clipboard. "
            "After pasting, click the scan/check button. "
            "Wait for results to fully load. "
            "CRITICAL: After results appear, SCROLL DOWN to see the complete results. "
            "Extract the AI score percentage and the Original score percentage. "
            "IMPORTANT: Originality.ai color-codes sentences — red/orange are AI-generated, "
            "green are considered original. Scroll through all results. "
            "Extract EVERY red or orange sentence exactly as written. "
            "\n\nTEXT TO PASTE AND CHECK:\n{text}"
        ),
    },
]


def _clean_draft_for_paste(text: str) -> str:
    """Normalize draft text to avoid literal \\n appearing in paste."""
    text = text.replace("\r\n", "\n")
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _parse_output(raw: str) -> tuple[float, list[str]]:
    """Extract AI score and flagged sentences from task output text."""
    score = 0.0
    matches = re.findall(r'(\d{1,3}(?:\.\d+)?)\s*%', raw)
    for m in matches:
        val = float(m)
        if 0 < val <= 100:
            score = val
            break

    flagged = []
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("-") or line.startswith("•") or line.startswith("*") or line.startswith('"'):
            sentence = line.lstrip('-•*" ').rstrip('"').strip()
            if len(sentence) > 20:
                flagged.append(sentence)

    return score, flagged


async def _run_detector(
    bu_client: AsyncBrowserUse,
    detector: dict,
    draft_text: str,
    send: callable,
) -> dict:
    """Create a session, get live URL, run detection task, extract results."""
    name = detector["name"]
    label = detector["label"]
    session_id = None

    try:
        session = await bu_client.sessions.create_session(
            keep_alive=True,
            start_url=detector["start_url"],
        )
        session_id = session.id
        live_url = session.live_url or ""

        log.info(f"[{name}] Session created: {session_id}")

        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": "session created, scanning..."
        })

        await send({
            "type": "browser_url",
            "name": name,
            "url": live_url,
        })

        clean_text = _clean_draft_for_paste(draft_text)
        task_text = detector["task_template"].format(text=clean_text)

        task = await bu_client.tasks.create_task(
            task=task_text,
            llm="browser-use-llm",
            session_id=session_id,
        )

        log.info(f"[{name}] Task created, waiting for completion...")

        result = await task.complete(interval=2)

        raw_output = result.output or ""
        log.info(f"[{name}] Done. Success={result.is_success}, output={len(raw_output)} chars")

        score, flagged = _parse_output(raw_output)

        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": f"score: {score:.1f}%, {len(flagged)} sentences flagged"
        })

        return {
            "name": name,
            "label": label,
            "score": score,
            "flagged_sentences": flagged,
            "raw_output": raw_output,
        }

    except Exception as e:
        detail = getattr(e, 'body', str(e))
        log.error(f"[{name}] Detector failed: {detail}")
        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": f"error: {str(detail)[:200]}"
        })
        return {
            "name": name,
            "label": label,
            "score": 0.0,
            "flagged_sentences": [],
            "raw_output": str(e),
        }
    finally:
        if session_id:
            try:
                await bu_client.sessions.delete_session(session_id)
            except Exception:
                pass


async def run_detection(
    draft_text: str,
    send: callable,
) -> dict:
    """Run all 3 detectors in parallel."""
    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    bu_client = AsyncBrowserUse(api_key=api_key)

    tasks = [
        _run_detector(bu_client, det, draft_text, send)
        for det in DETECTORS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    scores = {}
    all_flagged: list[str] = []
    detector_results = []

    for r in results:
        if isinstance(r, Exception):
            log.error(f"Detector gather exception: {r}")
            continue
        scores[r["name"]] = r["score"]
        all_flagged.extend(r["flagged_sentences"])
        detector_results.append(r)

    unique_flagged = list(dict.fromkeys(all_flagged))
    valid_scores = [s for s in scores.values() if s > 0]
    consensus = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

    verdict = "PASS" if consensus <= 10 else "REVISE"
    await send({
        "type": "agent_log",
        "agent": "consensus",
        "text": f"avg {consensus:.1f}%, {len(unique_flagged)} unique sentences flagged -> {verdict}",
    })

    flagged_with_sources = []
    for sentence in unique_flagged:
        flagged_by = [
            r["name"] for r in detector_results
            if sentence in r["flagged_sentences"]
        ]
        flagged_with_sources.append({
            "text": sentence,
            "flagged_by": flagged_by,
            "index": unique_flagged.index(sentence),
        })

    return {
        "scores": scores,
        "consensus": consensus,
        "flagged_sentences": flagged_with_sources,
        "detector_results": detector_results,
    }
