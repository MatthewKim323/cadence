from __future__ import annotations
import os
from pathlib import Path
import anthropic

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "writer.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()


async def write_draft(
    prompt: str,
    fingerprint: dict,
    send: callable,
    revision_info: dict | None = None,
) -> str:
    """Run Writer (Agent 2) with async streaming, return the full draft text."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    rules_block = "\n".join(f"- {r}" for r in fingerprint.get("writing_rules", []))
    exemplars_block = "\n\n".join(fingerprint.get("exemplar_passages", []))
    avoided_block = "\n".join(f"- {p}" for p in fingerprint.get("avoided_patterns", []))
    signature_block = ", ".join(fingerprint.get("signature_phrases", []))

    metrics = fingerprint.get("metrics", {})
    metrics_block = (
        f"Avg sentence length: {metrics.get('avg_sentence_length', 'N/A')} words\n"
        f"Sentence length variance: {metrics.get('sentence_length_variance', 'N/A')}\n"
        f"Formality: {metrics.get('formality', 'N/A')}\n"
        f"Directness: {metrics.get('directness', 'N/A')}\n"
        f"Em-dash frequency: {metrics.get('em_dash_frequency', 'N/A')}\n"
        f"Semicolon frequency: {metrics.get('semicolon_frequency', 'N/A')}"
    )

    fingerprint_section = (
        f"## VOICE FINGERPRINT\n\n"
        f"### Metrics\n{metrics_block}\n\n"
        f"### Writing Rules\n{rules_block}\n\n"
        f"### Signature Phrases\n{signature_block}\n\n"
        f"### Avoided Patterns\n{avoided_block}\n\n"
        f"### Exemplar Passages\n{exemplars_block}"
    )

    if revision_info:
        flagged = revision_info.get("flagged_sentences", [])
        flagged_text = "\n".join(
            f"- Sentence {s['index']}: \"{s['text']}\" (flagged by: {', '.join(s.get('flagged_by', []))})"
            for s in flagged
        )
        user_message = (
            f"{fingerprint_section}\n\n"
            f"## REVISION REQUEST\n\n"
            f"The following sentences were flagged as AI-generated. Rewrite ONLY these sentences "
            f"to better match the voice fingerprint. Keep all other sentences exactly the same.\n\n"
            f"{flagged_text}\n\n"
            f"## CURRENT DRAFT\n\n{revision_info['current_draft']}"
        )
        await send({
            "type": "agent_log",
            "agent": "writer",
            "text": f"revising {len(flagged)} flagged sentences..."
        })
    else:
        user_message = (
            f"{fingerprint_section}\n\n"
            f"## WRITING PROMPT\n\n{prompt}"
        )
        await send({
            "type": "agent_log",
            "agent": "writer",
            "text": "drafting... (streaming)"
        })

    full_draft = ""

    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=16384,
        thinking={
            "type": "enabled",
            "budget_tokens": 8192,
        },
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if hasattr(event.delta, "type"):
                    if event.delta.type == "thinking_delta":
                        chunk = event.delta.thinking
                        await send({"type": "thinking", "text": chunk})
                    elif event.delta.type == "text_delta":
                        chunk = event.delta.text
                        full_draft += chunk
                        await send({"type": "draft_chunk", "text": chunk})

    word_count = len(full_draft.split())
    paragraph_count = len([p for p in full_draft.split("\n\n") if p.strip()])

    await send({
        "type": "agent_log",
        "agent": "writer",
        "text": f"draft complete ({paragraph_count} paragraphs, {word_count} words)"
    })
    await send({"type": "draft_complete", "text": full_draft})

    return full_draft
