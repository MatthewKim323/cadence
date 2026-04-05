from __future__ import annotations
import asyncio
import json
import logging
import os
import re

from browser_use_sdk import AsyncBrowserUse

log = logging.getLogger("cadence")

TASK_TIMEOUT_SECONDS = 180

# Task 1: Just list what's in the unread inbox (simple, reliable)
LIST_TASK = (
    "You are on Gmail. Do these steps:\n"
    "1. Click the search bar at the top of Gmail.\n"
    "2. Type exactly: is:unread\n"
    "3. Press Enter to search.\n"
    "4. Look at the search results. For each email you see, note the sender name and subject line.\n"
    "5. Return a numbered list of ALL emails you see, in this exact format:\n"
    "LIST_START\n"
    "1. sender: [name] | subject: [subject]\n"
    "2. sender: [name] | subject: [subject]\n"
    "3. sender: [name] | subject: [subject]\n"
    "LIST_END\n"
    "Include every email visible. Do not skip any."
)

# Task 2 template: Open a specific email and read it (one at a time)
READ_TEMPLATE = (
    "You are on Gmail looking at search results for unread emails. "
    "Find and click on the email from '{sender}' with subject containing '{subject}'. "
    "Once the email is open, read the FULL body text carefully. Scroll down if needed. "
    "Then return the result in this EXACT format:\n"
    "EMAIL_START\n"
    "sender: {sender}\n"
    "subject: {subject}\n"
    "body: [paste the FULL email body here, every word]\n"
    "EMAIL_END\n"
    "After returning the result, click the back arrow to return to the search results."
)

# Module-level state for session reuse
_active_client: AsyncBrowserUse | None = None
_active_session_id: str | None = None


def _parse_email_list(raw: str) -> list[dict]:
    """Parse the numbered list of sender | subject from LIST task."""
    emails = []
    start = re.search(r'LIST_START', raw, re.IGNORECASE)
    end = re.search(r'LIST_END', raw, re.IGNORECASE)

    block = raw[start.end():end.start()] if start and end else raw

    for line in block.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        # Match patterns like "1. sender: Name | subject: Subj"
        m = re.match(
            r'\d+\.\s*sender:\s*(.+?)\s*\|\s*subject:\s*(.+)',
            line, re.IGNORECASE,
        )
        if m:
            emails.append({
                'sender': m.group(1).strip(),
                'subject': m.group(2).strip(),
            })

    return emails


def _parse_single_email(raw: str, fallback_sender: str, fallback_subject: str) -> dict:
    """Parse the body from a single READ task."""
    start = re.search(r'EMAIL_START', raw, re.IGNORECASE)
    end = re.search(r'EMAIL_END', raw, re.IGNORECASE)

    block = raw[start.end():end.start()] if start and end else raw

    body = ""
    body_match = re.search(
        r'body:\s*(.+?)(?=\nEMAIL_END|$)',
        block, re.DOTALL | re.IGNORECASE,
    )
    if body_match:
        body = body_match.group(1).strip()

    if not body:
        # Fallback: just grab everything after "body:"
        for line in block.split('\n'):
            if line.strip().lower().startswith('body:'):
                body = line.partition(':')[2].strip()
                break

    return {
        'sender': fallback_sender,
        'subject': fallback_subject,
        'body': body or "(could not extract body)",
        'needs_reply': 'yes',
    }


def _should_skip(sender: str, subject: str) -> bool:
    """Quick filter for obvious non-reply emails based on sender/subject."""
    lower_subj = subject.lower()
    lower_sender = sender.lower()

    skip_subjects = [
        'unsubscribe', 'newsletter', 'weekly digest', 'daily digest',
        'your order', 'shipping update', 'delivery notification',
        'password reset', 'verify your email', 'security alert',
        'no-reply', 'noreply', 'do not reply', 'donotreply',
    ]
    skip_senders = [
        'noreply', 'no-reply', 'mailer-daemon', 'postmaster',
        'notifications@', 'updates@', 'news@', 'marketing@',
        'donotreply', 'do-not-reply',
    ]

    for s in skip_subjects:
        if s in lower_subj:
            return True
    for s in skip_senders:
        if s in lower_sender:
            return True

    return False


async def scan_inbox(send: callable) -> list[dict]:
    """Scan Gmail inbox using multiple small tasks for reliability.
    Emails are yielded progressively via `send` as they're discovered.
    Returns the full list at the end.
    """
    global _active_client, _active_session_id

    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    profile_id = os.getenv("GMAIL_PROFILE_ID", "")

    if not profile_id:
        log.error("[inbox] GMAIL_PROFILE_ID not set")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": "Gmail profile not configured. Run setup_gmail_profile.py first."
        })
        return []

    client = AsyncBrowserUse(api_key=api_key)
    _active_client = client

    try:
        session = await client.sessions.create_session(
            keep_alive=True,
            start_url="https://mail.google.com",
            profile_id=profile_id,
        )
        _active_session_id = session.id
        live_url = session.live_url or ""

        log.info(f"[inbox] Session created: {_active_session_id}")

        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": "gmail session created"
        })
        await send({"type": "browser_url", "url": live_url})

        # --- TASK 1: List unread emails ---
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": "searching for unread emails..."
        })

        list_task = await client.tasks.create_task(
            task=LIST_TASK,
            llm="browser-use-llm",
            session_id=_active_session_id,
        )

        try:
            list_result = await asyncio.wait_for(
                list_task.complete(interval=2),
                timeout=TASK_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            log.warning("[inbox] List task timed out")
            await send({
                "type": "agent_log",
                "agent": "inbox",
                "text": "inbox scan timed out"
            })
            return []

        raw_list = list_result.output or ""
        log.info(f"[inbox] List output:\n{raw_list[:1500]}")

        email_list = _parse_email_list(raw_list)
        log.info(f"[inbox] Parsed {len(email_list)} emails from list")

        if not email_list:
            await send({
                "type": "agent_log",
                "agent": "inbox",
                "text": f"no unread emails found. raw output: {raw_list[:300]}"
            })
            return []

        # Filter out obvious non-reply emails
        actionable = []
        for e in email_list:
            if _should_skip(e['sender'], e['subject']):
                await send({
                    "type": "agent_log",
                    "agent": "inbox",
                    "text": f"skipping: {e['sender']} — {e['subject']}"
                })
            else:
                actionable.append(e)

        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"found {len(email_list)} unread, {len(actionable)} need replies"
        })

        # Send email_found for each one immediately
        for i, e in enumerate(actionable):
            await send({
                "type": "email_found",
                "sender": e['sender'],
                "subject": e['subject'],
                "index": i,
                "total": len(actionable),
            })

        # --- TASK 2+: Read each email one at a time ---
        full_emails = []
        for i, e in enumerate(actionable):
            await send({
                "type": "agent_log",
                "agent": "inbox",
                "text": f"reading email {i+1}/{len(actionable)}: {e['sender']}"
            })

            read_task_str = READ_TEMPLATE.format(
                sender=e['sender'],
                subject=e['subject'],
            )

            try:
                read_task = await client.tasks.create_task(
                    task=read_task_str,
                    llm="browser-use-llm",
                    session_id=_active_session_id,
                )

                read_result = await asyncio.wait_for(
                    read_task.complete(interval=2),
                    timeout=TASK_TIMEOUT_SECONDS,
                )

                raw_email = read_result.output or ""
                log.info(f"[inbox] Email {i+1} output:\n{raw_email[:800]}")

                parsed = _parse_single_email(raw_email, e['sender'], e['subject'])
                full_emails.append(parsed)

                # Send immediately so frontend can start showing it
                await send({
                    "type": "email_read",
                    "sender": parsed['sender'],
                    "subject": parsed['subject'],
                    "body": parsed['body'],
                    "index": i,
                    "total": len(actionable),
                })

            except asyncio.TimeoutError:
                log.warning(f"[inbox] Read task {i+1} timed out")
                await send({
                    "type": "agent_log",
                    "agent": "inbox",
                    "text": f"timed out reading email from {e['sender']}"
                })
            except Exception as ex:
                log.error(f"[inbox] Read task {i+1} failed: {ex}")
                await send({
                    "type": "agent_log",
                    "agent": "inbox",
                    "text": f"failed to read email from {e['sender']}: {str(ex)[:100]}"
                })

        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"finished reading {len(full_emails)} emails"
        })

        return full_emails

    except Exception as e:
        log.error(f"[inbox] Failed: {e}")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"inbox scan failed: {str(e)[:200]}"
        })
        return []


def _prepare_reply_for_browser(text: str) -> tuple[str, list[str]]:
    """Split reply into paragraphs for Browser Use to type with Enter presses.
    Returns (instruction_text, paragraphs).
    """
    t = text
    # Normalize broken escape sequences first
    t = t.replace('\\n', '\n')
    t = t.replace('/n', '\n')
    t = t.replace('\r\n', '\n')
    t = t.replace('\r', '\n')

    # Split into paragraphs on double newlines (or more)
    raw_paras = re.split(r'\n{2,}', t)
    paragraphs = [re.sub(r'\s+', ' ', p).strip() for p in raw_paras if p.strip()]

    if len(paragraphs) <= 1:
        return paragraphs[0] if paragraphs else text.strip(), paragraphs

    # Build numbered instruction
    lines = []
    for i, p in enumerate(paragraphs):
        lines.append(f"  Paragraph {i+1}: {p}")
        if i < len(paragraphs) - 1:
            lines.append(f"  [Then press Enter TWICE to make a new paragraph]")

    return '\n'.join(lines), paragraphs


async def send_reply_in_gmail(
    sender: str,
    subject: str,
    reply_text: str,
    send: callable,
) -> bool:
    """Use the still-alive Browser Use session to reply to an email in Gmail."""
    global _active_client, _active_session_id

    if not _active_client or not _active_session_id:
        log.error("[inbox] No active session for sending replies")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": "No active Gmail session. Cannot send reply."
        })
        return False

    formatted_reply, paragraphs = _prepare_reply_for_browser(reply_text)
    has_paragraphs = len(paragraphs) > 1

    reply_task = (
        f"You are in Gmail. Follow these steps to reply to an email:\n"
        f"1. Click the search bar at the top of Gmail.\n"
        f"2. Search for: from:{sender} subject:{subject}\n"
        f"3. Click on the matching email to open it.\n"
        f"4. Click the 'Reply' button at the bottom of the email.\n"
        f"5. In the reply text box, type the following message.\n"
    )

    if has_paragraphs:
        reply_task += (
            f"   IMPORTANT: This message has {len(paragraphs)} paragraphs. "
            f"Type each paragraph, then press Enter TWICE before typing the next one. "
            f"Do NOT type '/n' or '\\n' — press the actual Enter key.\n\n"
            f"{formatted_reply}\n\n"
        )
    else:
        reply_task += (
            f"   Type EXACTLY this (do not add anything extra, do not type /n or \\n):\n\n"
            f"   {formatted_reply}\n\n"
        )

    reply_task += (
        f"6. After typing the complete message, click the 'Send' button.\n"
        f"7. Confirm the reply was sent successfully.\n"
        f"Report SUCCESS if the reply was sent, or FAILED if something went wrong."
    )

    try:
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"sending reply to {sender}..."
        })

        task = await _active_client.tasks.create_task(
            task=reply_task,
            llm="browser-use-llm",
            session_id=_active_session_id,
        )

        result = await asyncio.wait_for(
            task.complete(interval=2),
            timeout=TASK_TIMEOUT_SECONDS,
        )

        output = (result.output or "").upper()
        success = "SUCCESS" in output and "FAILED" not in output

        log.info(f"[inbox] Reply task done. Success={success}. Output: {result.output[:300]}")

        return success

    except asyncio.TimeoutError:
        log.warning("[inbox] Reply task timed out")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"reply to {sender} timed out"
        })
        return False
    except Exception as e:
        log.error(f"[inbox] Reply failed: {e}")
        await send({
            "type": "agent_log",
            "agent": "inbox",
            "text": f"reply failed: {str(e)[:150]}"
        })
        return False


async def cleanup_inbox_session():
    """Stop the active inbox session (persists profile state)."""
    global _active_client, _active_session_id

    if _active_client and _active_session_id:
        try:
            await _active_client.sessions.update_session(_active_session_id, action="stop")
            log.info(f"[inbox] Session {_active_session_id} stopped (profile saved)")
        except Exception:
            try:
                await _active_client.sessions.delete_session(_active_session_id)
                log.info(f"[inbox] Session {_active_session_id} deleted (fallback)")
            except Exception:
                pass
        _active_session_id = None
        _active_client = None
        return

    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    if not api_key:
        return
    client = AsyncBrowserUse(api_key=api_key)
    try:
        resp = await client.sessions.list_sessions()
        for s in resp.items:
            if s.status == "active":
                try:
                    await client.sessions.update_session(s.id, action="stop")
                    log.info(f"[inbox] Stopped session {s.id}")
                except Exception:
                    try:
                        await client.sessions.delete_session(s.id)
                    except Exception:
                        pass
    except Exception as e:
        log.warning(f"[inbox] Sweep failed: {e}")
