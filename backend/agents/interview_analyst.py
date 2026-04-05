from __future__ import annotations
import json
import logging
import os
from pathlib import Path
import anthropic

log = logging.getLogger("cadence")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "interview_analyst.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()


def _repair_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text[:-3].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    text = text.replace("\u201c", '\\"').replace("\u201d", '\\"')
    text = text.replace("\u2018", "\\'").replace("\u2019", "\\'")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fixed = []
    in_string = False
    escaped = False
    for i, ch in enumerate(text):
        if escaped:
            fixed.append(ch)
            escaped = False
            continue
        if ch == '\\':
            fixed.append(ch)
            escaped = True
            continue
        if ch == '"':
            if not in_string:
                in_string = True
                fixed.append(ch)
            else:
                rest = text[i + 1:].lstrip()
                if rest and rest[0] in ',:]}':
                    in_string = False
                    fixed.append(ch)
                elif rest == '':
                    in_string = False
                    fixed.append(ch)
                else:
                    fixed.append('\\"')
        else:
            fixed.append(ch)

    try:
        return json.loads("".join(fixed))
    except json.JSONDecodeError:
        pass

    log.warning("Interview JSON repair failed, returning minimal fingerprint")
    return {
        "personality": {
            "communication_style": "Could not be determined from transcript.",
            "thinking_style": "mixed",
            "confidence_level": 0.5,
            "humor_frequency": "occasional",
            "formality": 0.3,
            "energy": "moderate",
        },
        "speech_patterns": {
            "avg_response_length": "medium",
            "filler_words": [],
            "sentence_starters": [],
            "hedging_phrases": [],
            "emphasis_words": [],
            "contraction_rate": "always",
            "uses_slang": False,
            "common_slang": [],
        },
        "reasoning_style": {
            "explains_with": "examples",
            "argument_structure": "associative",
            "handles_uncertainty": "admits openly",
            "depth_preference": "moderate",
        },
        "vocabulary": {
            "level": "conversational",
            "favorite_words": [],
            "avoided_words": [],
            "domain_specific": [],
        },
        "voice_rules": ["Transcript too short or unclear to extract rules."],
        "exemplar_quotes": [],
    }


async def analyze_interview(transcript: str) -> dict:
    """Analyze a voice interview transcript and return a voice fingerprint."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": transcript}],
    )

    raw = response.content[0].text.strip()
    fingerprint = _repair_json(raw)

    rules_count = len(fingerprint.get("voice_rules", []))
    quotes_count = len(fingerprint.get("exemplar_quotes", []))
    log.info(f"Interview fingerprint: {rules_count} rules, {quotes_count} quotes")

    return fingerprint
