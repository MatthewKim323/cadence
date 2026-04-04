from __future__ import annotations
import os
from pathlib import Path
import anthropic

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "comm_writer.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()


async def draft_reply(
    fingerprint: dict,
    email_context: dict,
    send: callable,
) -> str:
    """Draft a voice-matched email reply. Returns the draft text."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    style = fingerprint.get("email_style", {})
    patterns = fingerprint.get("response_patterns", {})
    rules_block = "\n".join(f"- {r}" for r in fingerprint.get("writing_rules", []))
    avoided_block = ", ".join(fingerprint.get("avoided_patterns", []))
    exemplars_block = "\n\n---\n\n".join(fingerprint.get("exemplar_emails", []))

    sender = email_context.get("sender", "Unknown")
    subject = email_context.get("subject", "")
    body = email_context.get("body", "")
    relationship = email_context.get("relationship", "peer")

    # Pick the right greeting/formality based on relationship
    if relationship == "manager":
        greeting = style.get("greeting_manager", style.get("greeting_peer", "Hi,"))
        formality = style.get("formality_manager", 0.5)
    elif relationship in ("executive", "external", "formal"):
        greeting = style.get("greeting_formal", "Hi,")
        formality = style.get("formality_formal", 0.7)
    else:
        greeting = style.get("greeting_peer", "Hey,")
        formality = style.get("formality_peer", 0.3)

    yes_phrases = ", ".join(patterns.get("says_yes", []))
    no_phrases = ", ".join(patterns.get("says_no", []))

    fingerprint_section = (
        f"## EMAIL VOICE PROFILE\n\n"
        f"Average email length: {style.get('avg_length_words', '?')} words\n"
        f"Greeting for this relationship: {greeting}\n"
        f"Sign-off: {style.get('signoff', 'Best')}\n"
        f"Formality level: {formality}/1.0\n"
        f"Uses emoji: {'yes' if style.get('uses_emoji') else 'no'}\n"
        f"Acknowledges first: {'yes' if patterns.get('acknowledgment_first') else 'no'}\n"
        f"Phrases for agreeing: {yes_phrases}\n"
        f"Phrases for declining: {no_phrases}\n\n"
        f"### Rules\n{rules_block}\n\n"
        f"### Never use\n{avoided_block}\n\n"
        f"### Examples of how this person writes emails\n\n{exemplars_block}"
    )

    user_message = (
        f"{fingerprint_section}\n\n"
        f"## EMAIL TO REPLY TO\n\n"
        f"From: {sender}\n"
        f"Subject: {subject}\n"
        f"Relationship: {relationship}\n\n"
        f"{body}\n\n"
        f"## YOUR TASK\n\n"
        f"Write a reply to this email. Match the voice profile exactly. "
        f"Keep it the same length as this person's typical emails."
    )

    await send({
        "type": "agent_log",
        "agent": "comm_writer",
        "text": f"drafting reply to {sender}..."
    })

    full_draft = ""

    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if hasattr(event.delta, "type") and event.delta.type == "text_delta":
                    chunk = event.delta.text
                    full_draft += chunk

    # Strip em-dashes
    full_draft = full_draft.replace(" — ", ", ").replace("—", ", ")

    await send({
        "type": "agent_log",
        "agent": "comm_writer",
        "text": f"reply to {sender} drafted ({len(full_draft.split())} words)"
    })

    return full_draft


async def compose_email(
    fingerprint: dict,
    recipient: str,
    relationship: str,
    intent: str,
    send: callable,
) -> str:
    """Compose a new email from user intent. Returns the draft text."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    style = fingerprint.get("email_style", {})
    patterns = fingerprint.get("response_patterns", {})
    rules_block = "\n".join(f"- {r}" for r in fingerprint.get("writing_rules", []))
    avoided_block = ", ".join(fingerprint.get("avoided_patterns", []))
    exemplars_block = "\n\n---\n\n".join(fingerprint.get("exemplar_emails", []))

    if relationship == "manager":
        greeting = style.get("greeting_manager", style.get("greeting_peer", "Hi,"))
        formality = style.get("formality_manager", 0.5)
    elif relationship in ("executive", "external", "formal"):
        greeting = style.get("greeting_formal", "Hi,")
        formality = style.get("formality_formal", 0.7)
    else:
        greeting = style.get("greeting_peer", "Hey,")
        formality = style.get("formality_peer", 0.3)

    fingerprint_section = (
        f"## EMAIL VOICE PROFILE\n\n"
        f"Average email length: {style.get('avg_length_words', '?')} words\n"
        f"Greeting for this relationship: {greeting}\n"
        f"Sign-off: {style.get('signoff', 'Best')}\n"
        f"Formality level: {formality}/1.0\n"
        f"Uses emoji: {'yes' if style.get('uses_emoji') else 'no'}\n\n"
        f"### Rules\n{rules_block}\n\n"
        f"### Never use\n{avoided_block}\n\n"
        f"### Examples of how this person writes emails\n\n{exemplars_block}"
    )

    user_message = (
        f"{fingerprint_section}\n\n"
        f"## COMPOSE A NEW EMAIL\n\n"
        f"To: {recipient}\n"
        f"Relationship: {relationship}\n"
        f"Intent: {intent}\n\n"
        f"Write this email. Match the voice profile exactly. "
        f"Keep it the same length as this person's typical emails."
    )

    full_draft = ""

    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if hasattr(event.delta, "type") and event.delta.type == "text_delta":
                    chunk = event.delta.text
                    full_draft += chunk

    full_draft = full_draft.replace(" — ", ", ").replace("—", ", ")

    return full_draft
