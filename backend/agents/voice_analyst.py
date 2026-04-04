from __future__ import annotations
import json
import os
from pathlib import Path
import anthropic

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "voice_analyst.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()


async def analyze_voice(
    document_texts: list[dict],
    send: callable,
) -> dict:
    """Run Voice Analyst (Agent 1) and return a voice fingerprint dict."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    combined = "\n\n---\n\n".join(
        f"### {doc['filename']} ({doc['category']})\n\n{doc['text']}"
        for doc in document_texts
    )

    await send({
        "type": "agent_log",
        "agent": "voice_analyst",
        "text": f"analyzing {len(document_texts)} documents for voice fingerprint..."
    })

    await send({"type": "thinking", "text": f"analyzing voice fingerprint from {len(document_texts)} selected documents..."})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": combined}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3].strip()

    fingerprint = json.loads(raw)

    rules_count = len(fingerprint.get("writing_rules", []))
    exemplars_count = len(fingerprint.get("exemplar_passages", []))

    await send({
        "type": "agent_log",
        "agent": "voice_analyst",
        "text": f"fingerprint extracted ({rules_count} rules, {exemplars_count} exemplars)"
    })

    metrics = fingerprint.get("metrics", {})
    await send({"type": "thinking", "text": f"avg sentence length: {metrics.get('avg_sentence_length', '?')} words."})
    await send({"type": "thinking", "text": f"sentence length variance: {metrics.get('sentence_length_variance', '?')}."})
    await send({"type": "thinking", "text": f"formality: {metrics.get('formality', '?')}, directness: {metrics.get('directness', '?')}."})
    await send({"type": "thinking", "text": f"em-dash frequency: {metrics.get('em_dash_frequency', '?')}. semicolons: {metrics.get('semicolon_frequency', '?')}."})

    avoided = fingerprint.get("avoided_patterns", [])
    if avoided:
        quoted = ['"' + p + '"' for p in avoided[:4]]
        await send({"type": "thinking", "text": f"avoids: {', '.join(quoted)}."})

    await send({"type": "thinking", "text": "voice profile assembled. starting draft with 3-layer prompt stack..."})
    await send({"type": "fingerprint", "data": fingerprint})

    return fingerprint
