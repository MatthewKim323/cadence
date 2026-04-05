"""
Long-Form Orchestrator — ASI:One-facing agent that coordinates the full
Cadence writing pipeline: Profile Digest -> Write -> Detect -> Revise loop.

Implements the Chat Protocol so it's discoverable on ASI:One.
Maintains per-sender session state to drive the async state machine.
"""
from __future__ import annotations

import json
import logging
import os
import random
import re
from datetime import datetime
from uuid import uuid4

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

from protocols.messages import (
    DetectRequest,
    DetectResult,
    DigestRequest,
    DigestResult,
    ReviseRequest,
    WriteRequest,
    WriteResult,
)

log = logging.getLogger("cadence.orchestrator")

# Deterministic addresses from agent seeds (never change unless seeds change)
DIGESTER_ADDRESS = "agent1qgjevr0qgxp4s3uzuyy3s0s2qpeq5lhsn3pnmky5wga9gmkns3m379mcszd"
WRITER_ADDRESS = "agent1qvgh6pfdafh5c0m8c8u4n33ptve6tv3mxpnlpky4a6qjk8jgq6975g4wptr"
ZEROGPT_ADDRESS = "agent1qv0rt92q02983q3wx2hxq7m6gpp7cspsx7976qgwgw5d6ee0wa5ck4ejn7w"
ORIGINALITY_ADDRESS = "agent1q2skk658am02lm44wat0rujqernyumvdqtchqhv7yq0hreff4z5jqgvrnde"

MAX_ITERATIONS = 5
PASS_THRESHOLD = 10.0

# ── Session state ──
# Key = sender address (one pipeline per user at a time)
sessions: dict[str, dict] = {}

# ── Noise injection (ported from backend/agents/writer.py) ──

_HOMOGLYPHS = {
    "a": "\u0430", "e": "\u0435", "o": "\u043e", "p": "\u0440",
    "c": "\u0441", "s": "\u0455", "i": "\u0456", "x": "\u0445",
    "A": "\u0410", "E": "\u0415", "O": "\u041e", "P": "\u0420",
    "C": "\u0421", "S": "\u0405", "B": "\u0412", "T": "\u0422",
}
_ZWSP = "\u200b"
_CONTRACTION_SWAPS = [
    ("it's", "its"), ("It's", "Its"), ("you're", "your"),
    ("You're", "Your"), ("they're", "their"), ("They're", "Their"),
]
_DOUBLE_WORD_TARGETS = ["the", "to", "and", "in", "a", "of", "that", "is", "was"]


def _inject_noise(text: str, intensity: int = 1) -> str:
    intensity = max(1, min(5, intensity))
    rng = random.Random()

    homoglyph_rate = 0.03 + (intensity - 1) * 0.05
    chars = list(text)
    for idx in range(len(chars)):
        if chars[idx] in _HOMOGLYPHS and rng.random() < homoglyph_rate:
            chars[idx] = _HOMOGLYPHS[chars[idx]]
    text = "".join(chars)

    zwsp_rate = 0.02 + (intensity - 1) * 0.025
    words = text.split(" ")
    result_words = []
    for w in words:
        result_words.append(w)
        if rng.random() < zwsp_rate and len(w) > 2:
            result_words.append(_ZWSP)
    text = " ".join(result_words)

    double_count = min(intensity, 4)
    sents = text.split(". ")
    doubles_done = 0
    for si in range(len(sents)):
        if doubles_done >= double_count:
            break
        ws = sents[si].split()
        for wi in range(len(ws) - 1, 0, -1):
            if ws[wi].lower().strip(".,!?") in _DOUBLE_WORD_TARGETS and rng.random() < 0.3:
                ws.insert(wi, ws[wi])
                doubles_done += 1
                break
        sents[si] = " ".join(ws)
    text = ". ".join(sents)

    swap_count = 0 if intensity < 2 else (1 if intensity < 4 else 2)
    swaps_done = 0
    for wrong, right in _CONTRACTION_SWAPS:
        if swaps_done >= swap_count:
            break
        pos = text.find(right)
        if pos != -1 and rng.random() < 0.5:
            text = text[:pos] + wrong + text[pos + len(right):]
            swaps_done += 1

    drop_count = min(intensity, 4)
    comma_conj = re.compile(r",\s+(and|but|so|or)\s", re.IGNORECASE)
    matches = list(comma_conj.finditer(text))
    if matches:
        rng.shuffle(matches)
        for m in matches[:drop_count]:
            text = text[: m.start()] + " " + m.group(1) + " " + text[m.end():]

    return text


# ── Helpers ──

def _parse_user_input(text: str) -> tuple[str | None, str]:
    """Extract .cadence JSON block and remaining writing prompt from user text."""
    json_match = re.search(r"\{[\s\S]*?\"cadence_version\"[\s\S]*?\}", text)
    if json_match:
        raw = json_match.group(0)
        depth, end = 0, 0
        for i, ch in enumerate(raw):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        json_str = raw[:end] if end > 0 else raw
        prompt = text[: json_match.start()] + text[json_match.start() + len(json_str):]
        prompt = re.sub(r"---+", "", prompt).strip()
        prompt = re.sub(r"\n{3,}", "\n\n", prompt).strip()
        return json_str, prompt
    return None, text.strip()


_status_logs: dict[str, list[str]] = {}


async def _status(ctx: Context, user_addr: str, text: str):
    _status_logs.setdefault(user_addr, []).append(text)
    full_log = "\n".join(f"→ {line}" for line in _status_logs[user_addr])
    await ctx.send(
        user_addr,
        ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[TextContent(type="text", text=full_log)],
        ),
    )


async def _finish(ctx: Context, user_addr: str, text: str, session_id: str):
    log = _status_logs.pop(user_addr, [])
    log_section = "\n".join(f"→ {line}" for line in log)
    full_text = f"{log_section}\n\n---\n\n{text}"
    await ctx.send(
        user_addr,
        ChatMessage(
            timestamp=datetime.utcnow(),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=full_text),
                EndSessionContent(type="end-session"),
            ],
        ),
    )
    sessions.pop(session_id, None)


# ── Agent ──

_README_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "README.md")

_agent_kw: dict = dict(
    name="Cadence Long-Form Orchestrator",
    seed=os.getenv("ORCHESTRATOR_SEED", "cadence-longform-orchestrator-seed-v1"),
    port=8001,
    mailbox=True,
    publish_agent_details=True,
    readme_path=_README_PATH,
)
if os.getenv("AGENT_SETUP_MODE"):
    _agent_kw["endpoint"] = ["http://127.0.0.1:8001/submit"]
longform_agent = Agent(**_agent_kw)

chat_proto = Protocol(spec=chat_protocol_spec)
internal_proto = Protocol(name="longform-internal")

_EMPTY_FP = json.dumps({
    "writing_rules": [], "metrics": {},
    "signature_phrases": [], "avoided_patterns": [], "exemplar_passages": [],
})


# ── Chat Protocol handlers (user-facing) ──

@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    ctx.logger.info(f"Received ChatMessage from {sender[:20]}...")
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id),
    )

    text = ""
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text

    ctx.logger.info(f"User text: {text[:100]}...")

    if not text.strip():
        await _status(ctx, sender, "Please provide a writing prompt (and optionally a .cadence profile).")
        return

    cadence_json, prompt = _parse_user_input(text)

    if not prompt:
        await _status(ctx, sender, "Couldn't find a writing prompt. Please include what you'd like me to write.")
        return

    ctx.logger.info(f"Prompt: {prompt[:80]}... | Has cadence: {cadence_json is not None}")

    sid = sender
    sessions[sid] = {
        "user": sender,
        "prompt": prompt,
        "cadence_json": cadence_json,
        "fp": None,
        "clean_draft": "",
        "noised_draft": "",
        "iter": 0,
        "pending": 0,
        "det_results": [],
        "history": [],
    }

    if cadence_json:
        await _status(ctx, sender, "Parsing your voice profile...")
        await ctx.send(DIGESTER_ADDRESS, DigestRequest(cadence_json=cadence_json, session_id=sid))
    else:
        sessions[sid]["fp"] = _EMPTY_FP
        sessions[sid]["iter"] = 1
        await _status(ctx, sender, "Writing first draft (no voice profile provided)...")
        await ctx.send(WRITER_ADDRESS, WriteRequest(prompt=prompt, fingerprint_json=_EMPTY_FP, session_id=sid))


@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


# ── Internal Protocol handlers (agent-to-agent) ──

@internal_proto.on_message(DigestResult)
async def handle_digest(ctx: Context, sender: str, msg: DigestResult):
    s = sessions.get(msg.session_id)
    if not s:
        return

    s["fp"] = msg.fingerprint_json
    s["iter"] = 1

    fp = json.loads(msg.fingerprint_json)
    n_rules = len(fp.get("writing_rules", []))
    await _status(ctx, s["user"], f"Profile digested ({n_rules} rules). Writing first draft...")

    await ctx.send(WRITER_ADDRESS, WriteRequest(
        prompt=s["prompt"], fingerprint_json=s["fp"], session_id=msg.session_id,
    ))


@internal_proto.on_message(WriteResult)
async def handle_write(ctx: Context, sender: str, msg: WriteResult):
    s = sessions.get(msg.session_id)
    if not s:
        return

    s["clean_draft"] = msg.draft
    iteration = s["iter"]
    noised = _inject_noise(msg.draft, intensity=iteration)
    s["noised_draft"] = noised

    wc = len(msg.draft.split())
    await _status(
        ctx, s["user"],
        f"Draft complete ({wc} words, noise {iteration}/5). Running detection...",
    )

    s["pending"] = 2
    s["det_results"] = []

    await ctx.send(ZEROGPT_ADDRESS, DetectRequest(draft_text=noised, session_id=msg.session_id))
    await ctx.send(ORIGINALITY_ADDRESS, DetectRequest(draft_text=noised, session_id=msg.session_id))


@internal_proto.on_message(DetectResult)
async def handle_detect(ctx: Context, sender: str, msg: DetectResult):
    s = sessions.get(msg.session_id)
    if not s:
        return

    s["det_results"].append({
        "name": msg.detector_name,
        "score": msg.ai_score,
        "flagged": json.loads(msg.flagged_sentences_json),
    })
    s["pending"] -= 1

    if s["pending"] > 0:
        return

    results = s["det_results"]
    valid = [r["score"] for r in results if r["score"] > 0]
    consensus = sum(valid) / len(valid) if valid else 0.0
    iteration = s["iter"]

    all_flagged: set[str] = set()
    for r in results:
        for sentence in r["flagged"]:
            all_flagged.add(sentence)

    s["history"].append({
        "iter": iteration,
        "scores": {r["name"]: r["score"] for r in results},
        "consensus": consensus,
        "flagged_count": len(all_flagged),
    })

    scores_str = " | ".join(f"{r['name']}: {r['score']:.1f}%" for r in results)
    await _status(
        ctx, s["user"],
        f"Round {iteration}: {scores_str} | Consensus: {consensus:.1f}% | "
        f"{len(all_flagged)} flagged",
    )

    def _report() -> str:
        return "\n".join(
            f"  Round {h['iter']}: {h['consensus']:.1f}% ({h['flagged_count']} flagged)"
            for h in s["history"]
        )

    if consensus <= PASS_THRESHOLD:
        await _finish(
            ctx, s["user"],
            f"Detection PASSED ({consensus:.1f}% avg AI)\n\n"
            f"Detection Report:\n"
            f"Iterations: {iteration} | Final: {consensus:.1f}%\n{_report()}\n\n"
            f"---\n\n{s['noised_draft']}",
            msg.session_id,
        )
        return

    if iteration >= MAX_ITERATIONS:
        await _finish(
            ctx, s["user"],
            f"Max iterations reached ({consensus:.1f}% avg AI)\n\n"
            f"Detection Report:\n{_report()}\n\n---\n\n{s['noised_draft']}",
            msg.session_id,
        )
        return

    s["iter"] += 1
    flagged_list = list(all_flagged)

    await _status(
        ctx, s["user"],
        f"Revising (iteration {s['iter']}, {len(flagged_list)} flagged)...",
    )

    await ctx.send(WRITER_ADDRESS, ReviseRequest(
        prompt=s["prompt"],
        fingerprint_json=s["fp"],
        current_draft=s["clean_draft"],
        flagged_sentences_json=json.dumps(flagged_list),
        session_id=msg.session_id,
    ))


longform_agent.include(chat_proto, publish_manifest=True)
longform_agent.include(internal_proto, publish_manifest=True)
