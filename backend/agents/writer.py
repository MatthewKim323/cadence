from __future__ import annotations
import os
import random
import re
from pathlib import Path
import anthropic

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "writer.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

# Sentences that start this way are AI giveaways
_AI_STARTERS = re.compile(
    r'^(Furthermore|Moreover|Additionally|In conclusion|'
    r'It is worth noting|It is important to note|'
    r'This highlights|This underscores|This demonstrates|'
    r'Consequently|Nevertheless|Nonetheless)',
    re.IGNORECASE,
)

# Tricolon pattern: "X. Y. Z." where all three have similar structure
_TRICOLON = re.compile(
    r'((?:Someone|Something|A place|The kind)\s+\w[^.]{5,40}\.\s*){3,}',
    re.IGNORECASE,
)


def _humanize_text(text: str) -> str:
    """Post-process generated text with structural variation.
    No typos, no word swaps. Only structural changes that are grammatically valid."""

    paragraphs = text.split("\n\n")
    processed_paragraphs = []

    for p_idx, p in enumerate(paragraphs):
        p = p.strip()
        if not p:
            continue

        sentences = re.split(r'(?<=[.!?])\s+', p)
        result = []

        for i, s in enumerate(sentences):
            if not s.strip():
                continue

            # Strip AI-giveaway sentence starters and rephrase with "And" or "But"
            if _AI_STARTERS.match(s):
                replacement = random.choice(["And ", "But ", ""])
                s = _AI_STARTERS.sub(replacement, s, count=1)
                if s and s[0].islower() and replacement == "":
                    s = s[0].upper() + s[1:]

            # ~10% chance: comma splice (merge two sentences)
            if random.random() < 0.10 and i < len(sentences) - 1 and s.endswith('.'):
                next_s = sentences[i + 1] if i + 1 < len(sentences) else ""
                if next_s and next_s[0].isupper() and len(next_s.split()) < 15:
                    s = s[:-1] + ", " + next_s[0].lower() + next_s[1:]
                    sentences[i + 1] = ""

            # ~8% chance: replace a period at end of a reflective sentence with ellipsis
            if (random.random() < 0.08
                    and s.endswith('.')
                    and not s.endswith('...')
                    and any(w in s.lower() for w in [
                        "i think", "maybe", "i guess", "sort of",
                        "probably", "not sure", "wonder", "honestly",
                        "something", "somehow", "kind of",
                    ])):
                s = s[:-1] + "..."

            result.append(s)

        processed_paragraphs.append(" ".join(r for r in result if r.strip()))

    output = "\n\n".join(processed_paragraphs)

    # Randomly drop some Oxford commas
    output = re.sub(
        r',(\s+and\s)',
        lambda m: m.group(1) if random.random() < 0.5 else m.group(0),
        output,
    )

    # Strip any em-dashes that slipped through
    output = output.replace(" — ", ", ").replace("—", ", ")

    return output


async def write_draft(
    prompt: str,
    fingerprint: dict,
    send: callable,
    revision_info: dict | None = None,
) -> str:
    """Run Writer with async streaming, return the full draft text."""
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    rules_block = "\n".join(f"- {r}" for r in fingerprint.get("writing_rules", []))
    exemplars_block = "\n\n---\n\n".join(fingerprint.get("exemplar_passages", []))
    avoided_block = ", ".join(fingerprint.get("avoided_patterns", []))

    metrics = fingerprint.get("metrics", {})

    fingerprint_section = (
        f"## HOW THIS PERSON WRITES\n\n"
        f"Average sentence: {metrics.get('avg_sentence_length', '?')} words. "
        f"Shortest: {metrics.get('shortest_sentence_words', '?')} words. "
        f"Longest: {metrics.get('longest_sentence_words', '?')} words.\n"
        f"Formality: {metrics.get('formality', '?')}/1.0. "
        f"Contractions: {metrics.get('contraction_rate', 'always')}.\n\n"
        f"### Rules\n{rules_block}\n\n"
        f"### Words/phrases to NEVER use\n{avoided_block}\n\n"
        f"### Examples of how this person actually writes (MATCH THIS STYLE EXACTLY)\n\n{exemplars_block}"
    )

    if revision_info:
        flagged = revision_info.get("flagged_sentences", [])
        flagged_text = "\n".join(f"- \"{s['text']}\"" for s in flagged)
        user_message = (
            f"{fingerprint_section}\n\n"
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
            f"## DRAFT TO REWRITE\n\n{revision_info['current_draft']}"
        )
        await send({
            "type": "agent_log",
            "agent": "writer",
            "text": f"rewriting from scratch ({len(flagged)} flagged)..."
        })
    else:
        user_message = (
            f"{fingerprint_section}\n\n"
            f"## WRITE THIS\n\n{prompt}\n\n"
            f"Match the exemplar style exactly. 4-8 paragraphs. Just write it, don't overthink it."
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
            "budget_tokens": 2048,
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

    humanized = _humanize_text(full_draft)

    word_count = len(humanized.split())
    paragraph_count = len([p for p in humanized.split("\n\n") if p.strip()])

    await send({
        "type": "agent_log",
        "agent": "writer",
        "text": f"draft complete ({paragraph_count} paragraphs, {word_count} words)"
    })
    await send({"type": "draft_complete", "text": humanized})

    return humanized
