from __future__ import annotations
import traceback
import uuid

from utils.pdf_extract import fetch_document_texts
from agents.comm_voice_analyst import analyze_comm_voice
from agents.comm_writer import draft_reply, compose_email
from agents.inbox_agent import scan_inbox


async def run_comms_pipeline(
    document_ids: list[str],
    user_id: str,
    send: callable,
):
    """Communication pipeline: voice analysis -> inbox scan -> draft replies."""
    try:
        # Phase 1: Analyze communication voice
        await send({"type": "status", "phase": "profiling"})

        doc_texts = await fetch_document_texts(document_ids, user_id)
        if not doc_texts:
            await send({
                "type": "error",
                "message": "No documents found. Upload communication samples first."
            })
            return

        await send({
            "type": "agent_log",
            "agent": "system",
            "text": f"extracted text from {len(doc_texts)} communication samples"
        })

        fingerprint = await analyze_comm_voice(doc_texts, send)

        # Phase 2: Scan inbox
        await send({"type": "status", "phase": "scanning"})
        await send({
            "type": "agent_log",
            "agent": "system",
            "text": "starting inbox scan..."
        })

        emails = await scan_inbox(send)

        if not emails:
            await send({
                "type": "agent_log",
                "agent": "system",
                "text": "no emails found that need replies"
            })
            await send({"type": "status", "phase": "complete"})
            await send({
                "type": "complete",
                "draft_count": 0,
                "message": "No emails found that need replies."
            })
            return

        await send({
            "type": "scan_progress",
            "current": len(emails),
            "total": len(emails),
        })

        # Phase 3: Draft replies for each email
        await send({"type": "status", "phase": "drafting"})

        draft_count = 0
        for i, email in enumerate(emails):
            await send({
                "type": "agent_log",
                "agent": "system",
                "text": f"drafting reply {i + 1}/{len(emails)}: {email.get('sender', 'Unknown')}"
            })

            try:
                draft_text = await draft_reply(
                    fingerprint=fingerprint,
                    email_context={
                        "sender": email.get("sender", "Unknown"),
                        "subject": email.get("subject", ""),
                        "body": email.get("body", ""),
                        "relationship": "peer",
                    },
                    send=send,
                )

                draft_id = str(uuid.uuid4())[:8]

                await send({
                    "type": "draft_reply",
                    "id": draft_id,
                    "sender": email.get("sender", "Unknown"),
                    "subject": email.get("subject", ""),
                    "body": email.get("body", ""),
                    "draft": draft_text,
                    "index": i,
                    "total": len(emails),
                })

                draft_count += 1

            except Exception as e:
                traceback.print_exc()
                await send({
                    "type": "agent_log",
                    "agent": "comm_writer",
                    "text": f"failed to draft reply for {email.get('sender', '?')}: {str(e)[:100]}"
                })

        # Phase 4: Complete
        await send({"type": "status", "phase": "complete"})
        await send({
            "type": "complete",
            "draft_count": draft_count,
            "message": f"Drafted {draft_count} replies."
        })

    except Exception as e:
        if "PipelineCancelled" in type(e).__name__:
            raise
        traceback.print_exc()
        try:
            await send({"type": "error", "message": str(e)})
        except Exception:
            pass


async def run_compose(
    document_ids: list[str],
    user_id: str,
    recipient: str,
    relationship: str,
    intent: str,
    send: callable,
) -> str:
    """Compose mode: analyze voice + generate one email from intent."""
    doc_texts = await fetch_document_texts(document_ids, user_id)

    if doc_texts:
        fingerprint = await analyze_comm_voice(doc_texts, send)
    else:
        # Use a minimal default fingerprint if no docs
        fingerprint = {
            "email_style": {
                "avg_length_words": 40,
                "greeting_peer": f"Hey {recipient},",
                "greeting_manager": f"Hi {recipient},",
                "greeting_formal": f"Hi {recipient},",
                "signoff": "Best",
                "uses_emoji": False,
                "formality_peer": 0.3,
                "formality_manager": 0.5,
                "formality_formal": 0.7,
            },
            "response_patterns": {
                "acknowledgment_first": True,
                "asks_followup_questions": True,
                "says_yes": ["Sounds good"],
                "says_no": ["I can't make that work"],
            },
            "writing_rules": ["Use contractions", "Keep it short"],
            "avoided_patterns": [],
            "exemplar_emails": [],
        }

    draft = await compose_email(
        fingerprint=fingerprint,
        recipient=recipient,
        relationship=relationship,
        intent=intent,
        send=send,
    )

    return draft
