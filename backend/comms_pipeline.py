from __future__ import annotations
import traceback
import uuid

from utils.pdf_extract import fetch_document_texts
from agents.comm_voice_analyst import analyze_comm_voice
from agents.comm_writer import draft_reply
from agents.inbox_agent import scan_inbox


async def run_comms_pipeline(
    document_ids: list[str],
    user_id: str,
    send: callable,
):
    """Communication pipeline: voice analysis -> progressive inbox scan + draft."""
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

        # Phase 2: Scan inbox (emails arrive progressively via email_read messages)
        await send({"type": "status", "phase": "scanning"})
        await send({
            "type": "agent_log",
            "agent": "system",
            "text": "starting inbox scan..."
        })

        # Collect emails as they come in via a wrapper
        collected_emails: list[dict] = []
        draft_count = 0

        original_send = send

        async def intercepting_send(msg: dict):
            """Intercept email_read messages to draft replies on the fly."""
            nonlocal draft_count

            await original_send(msg)

            if msg.get("type") == "email_read":
                collected_emails.append(msg)

                # Immediately draft a reply for this email
                await original_send({"type": "status", "phase": "drafting"})
                await original_send({
                    "type": "agent_log",
                    "agent": "system",
                    "text": f"drafting reply to {msg.get('sender', 'Unknown')}..."
                })

                try:
                    draft_text = await draft_reply(
                        fingerprint=fingerprint,
                        email_context={
                            "sender": msg.get("sender", "Unknown"),
                            "subject": msg.get("subject", ""),
                            "body": msg.get("body", ""),
                            "relationship": "peer",
                        },
                        send=original_send,
                    )

                    draft_id = str(uuid.uuid4())[:8]

                    await original_send({
                        "type": "draft_reply",
                        "id": draft_id,
                        "sender": msg.get("sender", "Unknown"),
                        "subject": msg.get("subject", ""),
                        "body": msg.get("body", ""),
                        "draft": draft_text,
                        "index": msg.get("index", 0),
                        "total": msg.get("total", 1),
                    })

                    draft_count += 1

                except Exception as e:
                    traceback.print_exc()
                    await original_send({
                        "type": "agent_log",
                        "agent": "comm_writer",
                        "text": f"failed to draft reply: {str(e)[:100]}"
                    })

                # Switch back to scanning phase if more emails to read
                if msg.get("index", 0) < msg.get("total", 1) - 1:
                    await original_send({"type": "status", "phase": "scanning"})

        emails = await scan_inbox(intercepting_send)

        # Complete
        await send({"type": "status", "phase": "complete"})
        await send({
            "type": "complete",
            "draft_count": draft_count,
            "message": f"Drafted {draft_count} replies." if draft_count > 0
                       else "No emails found that need replies."
        })

    except Exception as e:
        if "PipelineCancelled" in type(e).__name__:
            raise
        traceback.print_exc()
        try:
            await send({"type": "error", "message": str(e)})
        except Exception:
            pass
