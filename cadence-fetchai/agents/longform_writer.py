from __future__ import annotations

import json
import os
import random
import re
from pathlib import Path

import anthropic
from uagents import Agent, Context, Protocol

from protocols.messages import ReviseRequest, WriteRequest, WriteResult

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "writer.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

_AI_STARTERS = re.compile(
    r"^(Furthermore|Moreover|Additionally|In conclusion|"
    r"It is worth noting|It is important to note|"
    r"This highlights|This underscores|This demonstrates|"
    r"Consequently|Nevertheless|Nonetheless)",
    re.IGNORECASE,
)


def _humanize_text(text: str) -> str:
    """Post-process generated text with structural variation."""
    paragraphs = text.split("\n\n")
    processed = []

    for p in paragraphs:
        p = p.strip()
        if not p:
            continue

        sentences = re.split(r"(?<=[.!?])\s+", p)
        result = []

        for i, s in enumerate(sentences):
            if not s.strip():
                continue

            if _AI_STARTERS.match(s):
                replacement = random.choice(["And ", "But ", ""])
                s = _AI_STARTERS.sub(replacement, s, count=1)
                if s and s[0].islower() and replacement == "":
                    s = s[0].upper() + s[1:]

            if random.random() < 0.10 and i < len(sentences) - 1 and s.endswith("."):
                next_s = sentences[i + 1] if i + 1 < len(sentences) else ""
                if next_s and next_s[0].isupper() and len(next_s.split()) < 15:
                    s = s[:-1] + ", " + next_s[0].lower() + next_s[1:]
                    sentences[i + 1] = ""

            if (
                random.random() < 0.08
                and s.endswith(".")
                and not s.endswith("...")
                and any(
                    w in s.lower()
                    for w in [
                        "i think", "maybe", "i guess", "sort of",
                        "probably", "not sure", "wonder", "honestly",
                        "something", "somehow", "kind of",
                    ]
                )
            ):
                s = s[:-1] + "..."

            result.append(s)

        processed.append(" ".join(r for r in result if r.strip()))

    output = "\n\n".join(processed)
    output = re.sub(
        r",(\s+and\s)",
        lambda m: m.group(1) if random.random() < 0.5 else m.group(0),
        output,
    )
    output = output.replace(" — ", ", ").replace("—", ", ")
    return output


def _build_fingerprint_section(fingerprint: dict) -> str:
    rules = "\n".join(f"- {r}" for r in fingerprint.get("writing_rules", []))
    exemplars = "\n\n---\n\n".join(fingerprint.get("exemplar_passages", []))
    avoided = ", ".join(fingerprint.get("avoided_patterns", []))
    m = fingerprint.get("metrics", {})

    return (
        f"## HOW THIS PERSON WRITES\n\n"
        f"Average sentence: {m.get('avg_sentence_length', '?')} words. "
        f"Shortest: {m.get('shortest_sentence_words', '?')} words. "
        f"Longest: {m.get('longest_sentence_words', '?')} words.\n"
        f"Formality: {m.get('formality', '?')}/1.0. "
        f"Contractions: {m.get('contraction_rate', 'always')}.\n\n"
        f"### Rules\n{rules}\n\n"
        f"### Words/phrases to NEVER use\n{avoided}\n\n"
        f"### Examples of how this person actually writes (MATCH THIS STYLE EXACTLY)\n\n{exemplars}"
    )


def _call_claude(user_message: str) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=16384,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text.strip()


# ── Agent ──

writer_agent = Agent(
    name="Cadence Long-Form Writer",
    seed=os.getenv("WRITER_SEED", "cadence-longform-writer-seed-v1"),
    port=8003,
    endpoint=["http://127.0.0.1:8003/submit"],
    mailbox=True,
    publish_agent_details=True,
    network="testnet",
)

proto = Protocol(name="longform-writer")


@proto.on_message(WriteRequest)
async def handle_write(ctx: Context, sender: str, msg: WriteRequest):
    ctx.logger.info(f"Writing initial draft for session {msg.session_id[:16]}...")

    fingerprint = json.loads(msg.fingerprint_json)
    fp_section = _build_fingerprint_section(fingerprint)

    user_message = (
        f"{fp_section}\n\n"
        f"## WRITE THIS\n\n{msg.prompt}\n\n"
        f"Match the exemplar style exactly. 4-8 paragraphs. Just write it, don't overthink it."
    )

    raw = _call_claude(user_message)
    draft = _humanize_text(raw)

    ctx.logger.info(f"Draft complete: {len(draft.split())} words")
    await ctx.send(sender, WriteResult(draft=draft, session_id=msg.session_id))


@proto.on_message(ReviseRequest)
async def handle_revise(ctx: Context, sender: str, msg: ReviseRequest):
    ctx.logger.info(f"Revising draft for session {msg.session_id[:16]}...")

    fingerprint = json.loads(msg.fingerprint_json)
    fp_section = _build_fingerprint_section(fingerprint)
    flagged = json.loads(msg.flagged_sentences_json)
    flagged_text = "\n".join(f'- "{s}"' for s in flagged)

    user_message = (
        f"{fp_section}\n\n"
        f"## REWRITE THIS ESSAY\n\n"
        f"This draft got flagged as AI. You need to rewrite the WHOLE thing from scratch. "
        f"Same ideas, but say everything differently. Don't just swap synonyms.\n\n"
        f"Specifically apply these transformations:\n"
        f"1. Any sentence that sounds 'written' instead of 'spoken', rewrite it how you'd actually say it out loud\n"
        f"2. Replace clean metaphors with blunt, specific, even ugly descriptions\n"
        f"3. Kill any tricolons (groups of 3). Cut to 2 or make them uneven\n"
        f"4. If there's a quotable 'insight line' that sounds like a tweet, cut it or bury it in a longer paragraph\n"
        f"5. Add filler words naturally: 'just', 'honestly', 'like', 'totally'. Cluster them, don't sprinkle evenly\n"
        f"6. Use ellipsis (...) for 2-3 dramatic pauses instead of clean periods\n"
        f"7. Start some sentences with 'And' or 'But'\n"
        f"8. End bluntly. Don't wrap up with a bow\n\n"
        f"These sentences were flagged as most AI-sounding:\n{flagged_text}\n\n"
        f"Output ONLY the rewritten essay. No labels, no numbering, just the essay.\n\n"
        f"## DRAFT TO REWRITE\n\n{msg.current_draft}"
    )

    raw = _call_claude(user_message)
    draft = _humanize_text(raw)

    ctx.logger.info(f"Revision complete: {len(draft.split())} words")
    await ctx.send(sender, WriteResult(draft=draft, session_id=msg.session_id))


writer_agent.include(proto, publish_manifest=True)
