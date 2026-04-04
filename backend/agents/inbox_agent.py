from __future__ import annotations
import asyncio
import json
import logging
import os
import re

from browser_use_sdk import AsyncBrowserUse

log = logging.getLogger("cadence")

TASK_TIMEOUT_SECONDS = 240

INBOX_TASK = (
    "You are on Gmail. Follow these steps:\n"
    "1. You should already be logged in. If you see the inbox, proceed. "
    "If you see a login page, report that login is required.\n"
    "2. Look at the inbox. Find unread emails (they appear in bold).\n"
    "3. For each unread email (up to 8), click on it to open it and read:\n"
    "   - The sender's name\n"
    "   - The subject line\n"
    "   - The full email body text\n"
    "   Then press the back button to return to the inbox and open the next one.\n"
    "4. Skip emails that are clearly:\n"
    "   - Newsletters or marketing (unsubscribe links, promotional content)\n"
    "   - Automated notifications (GitHub, Google alerts, shipping updates)\n"
    "   - Spam\n"
    "   These don't need replies.\n"
    "5. After reading all unread emails, return your findings in this EXACT format:\n"
    "   EMAILS_START\n"
    "   ---\n"
    "   sender: [sender name]\n"
    "   subject: [subject line]\n"
    "   body: [full email body text]\n"
    "   needs_reply: yes\n"
    "   ---\n"
    "   sender: [sender name]\n"
    "   subject: [subject line]\n"
    "   body: [full email body text]\n"
    "   needs_reply: no\n"
    "   reason: newsletter\n"
    "   ---\n"
    "   EMAILS_END\n\n"
    "   Include ALL emails you found, marking each as needs_reply: yes or no.\n"
    "   For emails that don't need a reply, include a reason (newsletter, notification, spam)."
)


def _parse_inbox_output(raw: str) -> list[dict]:
    """Parse the structured email output from the Browser Use agent."""
    emails = []

    # Find the EMAILS_START/END block
    start_match = re.search(r'EMAILS_START', raw, re.IGNORECASE)
    end_match = re.search(r'EMAILS_END', raw, re.IGNORECASE)

    if start_match and end_match:
        block = raw[start_match.end():end_match.start()]
    else:
        block = raw

    # Split by --- delimiter
    chunks = re.split(r'\n---\n', block)

    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue

        email = {}
        for line in chunk.split('\n'):
            line = line.strip()
            if ':' in line:
                key, _, value = line.partition(':')
                key = key.strip().lower()
                value = value.strip()
                if key in ('sender', 'subject', 'needs_reply', 'reason'):
                    email[key] = value
                elif key == 'body':
                    email['body'] = value

        # Also try to capture multi-line body
        body_match = re.search(r'body:\s*(.+?)(?=\n(?:needs_reply|reason|sender|subject|---)|$)',
                               chunk, re.DOTALL | re.IGNORECASE)
        if body_match:
            email['body'] = body_match.group(1).strip()

        if email.get('sender') and email.get('subject'):
            email.setdefault('needs_reply', 'yes')
            email.setdefault('body', '')
            emails.append(email)

    return emails


async def scan_inbox(send: callable) -> list[dict]:
    """Create a Browser Use session on Gmail, read unread emails,
    return list of email contexts that need replies.

    Sends browser_url and progress updates via `send`.
    """
    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    profile_id = os.getenv("GMAIL_PROFILE_ID", "")
    client = AsyncBrowserUse(api_key=api_key)

    session = None
    session_id = None

    if not profile_id:
        log.error("[inbox] GMAIL_PROFILE_ID not set — run setup_gmail_profile.py first")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": "Gmail profile not configured. Run setup_gmail_profile.py first."
        })
        return []

    try:
        session = await client.sessions.create_session(
            keep_alive=True,
            start_url="https://mail.google.com",
            profile_id=profile_id,
        )
        session_id = session.id
        live_url = session.live_url or ""

        log.info(f"[inbox] Session created: {session_id}")

        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": "gmail session created, scanning inbox..."
        })

        await send({
            "type": "browser_url",
            "url": live_url,
        })

        task = await client.tasks.create_task(
            task=INBOX_TASK,
            llm="browser-use-llm",
            session_id=session_id,
        )

        log.info(f"[inbox] Task created, waiting (timeout={TASK_TIMEOUT_SECONDS}s)...")

        try:
            result = await asyncio.wait_for(
                task.complete(interval=2),
                timeout=TASK_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            log.warning(f"[inbox] Task timed out after {TASK_TIMEOUT_SECONDS}s")
            await send({
                "type": "agent_log",
                "agent": "inbox",
                "text": f"inbox scan timed out after {TASK_TIMEOUT_SECONDS}s"
            })
            return []

        raw_output = result.output or ""
        log.info(f"[inbox] Done. output:\n{raw_output[:1000]}")

        all_emails = _parse_inbox_output(raw_output)

        # Filter to only emails that need replies
        reply_emails = [
            e for e in all_emails
            if e.get("needs_reply", "").lower() in ("yes", "true", "1")
        ]
        skipped = len(all_emails) - len(reply_emails)

        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"found {len(all_emails)} emails, {len(reply_emails)} need replies ({skipped} skipped)"
        })

        # Send progress for each found email
        for i, email in enumerate(reply_emails):
            await send({
                "type": "email_found",
                "sender": email.get("sender", "Unknown"),
                "subject": email.get("subject", ""),
                "index": i,
                "total": len(reply_emails),
            })

        return reply_emails

    except Exception as e:
        log.error(f"[inbox] Failed: {e}")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"inbox scan failed: {str(e)[:200]}"
        })
        return []

    finally:
        if session_id:
            try:
                # Use stop() instead of delete() to persist profile cookies/login
                await client.sessions.stop(session_id)
                log.info(f"[inbox] Session {session_id} stopped (profile state saved)")
            except Exception:
                try:
                    await client.sessions.delete_session(session_id)
                    log.info(f"[inbox] Session {session_id} deleted (fallback)")
                except Exception:
                    pass


async def cleanup_inbox_session():
    """Sweep any lingering inbox sessions (stop to preserve profile state)."""
    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    client = AsyncBrowserUse(api_key=api_key)
    try:
        resp = await client.sessions.list_sessions()
        for s in resp.items:
            if s.status == "active":
                try:
                    await client.sessions.stop(s.id)
                    log.info(f"[inbox] Stopped session {s.id}")
                except Exception:
                    try:
                        await client.sessions.delete_session(s.id)
                    except Exception:
                        pass
    except Exception as e:
        log.warning(f"[inbox] Sweep failed: {e}")
