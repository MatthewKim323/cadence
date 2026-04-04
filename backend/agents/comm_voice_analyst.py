from __future__ import annotations
import json
import logging
import os
from pathlib import Path
import anthropic

log = logging.getLogger("cadence")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "comm_voice_analyst.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

# Reuse the JSON repair logic from the writing voice analyst
from agents.voice_analyst import _repair_json


_FALLBACK_FINGERPRINT = {
    "email_style": {
        "avg_length_words": 40,
        "greeting_peer": "Hey {name},",
        "greeting_manager": "Hi {name},",
        "greeting_formal": "Hi {name},",
        "signoff": "Best",
        "uses_emoji": False,
        "common_emoji": [],
        "formality_peer": 0.3,
        "formality_manager": 0.5,
        "formality_formal": 0.7,
    },
    "response_patterns": {
        "acknowledgment_first": True,
        "asks_followup_questions": True,
        "says_yes": ["Sounds good", "Works for me"],
        "says_no": ["I can't make that work"],
        "common_transitions": ["Also"],
    },
    "writing_rules": [
        "Use contractions always",
        "Keep emails to 2-4 sentences for peers",
        "Start with a greeting + first name",
    ],
    "avoided_patterns": ["Per my last email", "I hope this finds you well"],
    "exemplar_emails": [],
}


async def analyze_comm_voice(
    document_texts: list[dict],
    send: callable,
) -> dict:
    """Analyze email samples and return a communication fingerprint."""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    combined = "\n\n---\n\n".join(
        f"### {doc['filename']} ({doc['category']})\n\n{doc['text']}"
        for doc in document_texts
    )

    await send({
        "type": "agent_log",
        "agent": "comm_analyst",
        "text": f"analyzing {len(document_texts)} email samples..."
    })

    await send({"type": "thinking", "text": f"reading {len(document_texts)} email samples..."})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": combined}],
    )

    raw = response.content[0].text.strip()

    try:
        fingerprint = _repair_json(raw)
    except Exception:
        log.warning("Comm fingerprint JSON parse failed, using fallback")
        fingerprint = _FALLBACK_FINGERPRINT

    rules_count = len(fingerprint.get("writing_rules", []))
    exemplars_count = len(fingerprint.get("exemplar_emails", []))

    await send({
        "type": "agent_log",
        "agent": "comm_analyst",
        "text": f"comm profile ready ({rules_count} rules, {exemplars_count} exemplars)"
    })

    style = fingerprint.get("email_style", {})
    await send({"type": "thinking", "text": f"avg email: {style.get('avg_length_words', '?')} words"})
    await send({"type": "thinking", "text": f"greeting (peer): {style.get('greeting_peer', '?')}"})
    await send({"type": "thinking", "text": f"signoff: {style.get('signoff', '?')}"})
    await send({"type": "thinking", "text": "comm profile assembled. starting inbox scan..."})

    await send({"type": "comm_fingerprint", "data": fingerprint})

    return fingerprint
