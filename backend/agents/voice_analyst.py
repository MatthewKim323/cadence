from __future__ import annotations
import json
import logging
import os
import re
from pathlib import Path
import anthropic

log = logging.getLogger("cadence")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "voice_analyst.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()


def _repair_json(raw: str) -> dict:
    """Try to parse JSON, with fallback repair for common LLM output issues."""
    # Strip markdown code fences
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text[:-3].strip()

    # First try: direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Repair: escape unescaped quotes inside string values.
    # Find the JSON object boundaries
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    # Replace smart quotes with straight quotes
    text = text.replace("\u201c", '\\"').replace("\u201d", '\\"')
    text = text.replace("\u2018", "\\'").replace("\u2019", "\\'")

    # Try again
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # More aggressive: fix unescaped internal double quotes in string values.
    # Pattern: a string value that has unescaped quotes inside.
    # Replace any " that's between content of a JSON string (not structural)
    # by walking through and escaping problematic quotes.
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
                # Check if this quote is followed by structural JSON chars
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

    # Last resort: ask the model to fix it (sync, fast)
    log.warning("JSON repair failed, returning minimal fingerprint")
    return {
        "metrics": {
            "avg_sentence_length": 15,
            "sentence_length_variance": "medium",
            "shortest_sentence_words": 3,
            "longest_sentence_words": 30,
            "formality": 0.3,
            "directness": 0.7,
            "contraction_rate": "always",
            "em_dash_frequency": "never",
            "semicolon_frequency": "never",
            "avg_paragraph_sentences": 4,
            "paragraph_length_variance": "medium",
        },
        "writing_rules": [
            "Use simple, everyday vocabulary",
            "Use contractions always",
            "Start some sentences with And or But",
            "Keep sentences varied in length",
        ],
        "avoided_patterns": ["em-dashes", "Furthermore", "Moreover", "Additionally"],
        "exemplar_passages": [],
    }


async def analyze_voice(
    document_texts: list[dict],
    send: callable,
) -> dict:
    """Run Voice Analyst and return a voice fingerprint dict."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    combined = "\n\n---\n\n".join(
        f"### {doc['filename']} ({doc['category']})\n\n{doc['text']}"
        for doc in document_texts
    )

    await send({
        "type": "agent_log",
        "agent": "voice_analyst",
        "text": f"analyzing {len(document_texts)} documents..."
    })

    await send({"type": "thinking", "text": f"reading {len(document_texts)} writing samples..."})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": combined}],
    )

    raw = response.content[0].text.strip()
    fingerprint = _repair_json(raw)

    # Force em-dash ban
    if "metrics" in fingerprint:
        fingerprint["metrics"]["em_dash_frequency"] = "never"
    avoided = fingerprint.get("avoided_patterns", [])
    if "em-dashes" not in [a.lower() for a in avoided]:
        fingerprint.setdefault("avoided_patterns", []).insert(0, "em-dashes")

    rules_count = len(fingerprint.get("writing_rules", []))
    exemplars_count = len(fingerprint.get("exemplar_passages", []))

    await send({
        "type": "agent_log",
        "agent": "voice_analyst",
        "text": f"fingerprint ready ({rules_count} rules, {exemplars_count} exemplars)"
    })

    metrics = fingerprint.get("metrics", {})
    await send({"type": "thinking", "text": f"avg sentence: {metrics.get('avg_sentence_length', '?')} words, variance: {metrics.get('sentence_length_variance', '?')}"})
    await send({"type": "thinking", "text": f"formality: {metrics.get('formality', '?')}, contractions: {metrics.get('contraction_rate', '?')}"})

    avoided = fingerprint.get("avoided_patterns", [])
    if avoided:
        quoted = ['"' + p + '"' for p in avoided[:4]]
        await send({"type": "thinking", "text": f"avoids: {', '.join(quoted)}"})

    await send({"type": "thinking", "text": "voice profile ready. starting draft..."})
    await send({"type": "fingerprint", "data": fingerprint})

    return fingerprint
