from __future__ import annotations
import asyncio
import logging
import os
import re

from browser_use_sdk import AsyncBrowserUse

log = logging.getLogger("cadence")

_active_sessions: set[str] = set()
_bu_client: AsyncBrowserUse | None = None

TASK_TIMEOUT_SECONDS = 180

DETECTORS = [
    {
        "name": "zerogpt",
        "label": "ZeroGPT",
        "start_url": "https://www.zerogpt.com",
        "task_template": (
            "You are on ZeroGPT.com. Follow these steps:\n"
            "1. Find the large text input area. Click on it.\n"
            "2. Type the ENTIRE text below into the text area.\n"
            "3. Click the 'Detect Text' button.\n"
            "4. Wait for results to load (5-15 seconds).\n"
            "5. Scroll down to see the results.\n"
            "6. Read the AI-generated percentage (e.g. '85.67% AI GPT').\n"
            "7. Look at the results text carefully. Sentences highlighted with a YELLOW BACKGROUND are AI-detected.\n"
            "   Scroll through the ENTIRE results text from top to bottom.\n"
            "   For each highlighted sentence, copy the FIRST 6 WORDS of that sentence.\n"
            "8. Return ONLY this format:\n"
            "   AI Score: [percentage]%\n"
            "   Flagged:\n"
            "   - [first 6 words of sentence 1]...\n"
            "   - [first 6 words of sentence 2]...\n"
            "   If no sentences are highlighted, write: Flagged: none\n\n"
            "TEXT TO CHECK:\n\n{text}"
        ),
    },
    {
        "name": "originality",
        "label": "Originality.ai",
        "start_url": "https://originality.ai/ai-checker",
        "task_template": (
            "You are on Originality.ai free AI checker. Follow these steps:\n"
            "1. Find the text input area. Click on it.\n"
            "2. Type the ENTIRE text below into the text area.\n"
            "3. Click the scan/check button.\n"
            "4. Wait for results to load (10-30 seconds).\n"
            "5. Scroll down to see results.\n"
            "6. On the RIGHT side, read the overall AI percentage score.\n"
            "7. Look at the analyzed text. Sentences have colored backgrounds:\n"
            "   GREEN = human (skip these)\n"
            "   YELLOW/ORANGE = risky (include these)\n"
            "   RED/PINK = AI detected (include these)\n"
            "   Scroll through ALL results from top to bottom.\n"
            "   For each non-green sentence, copy the FIRST 6 WORDS of that sentence.\n"
            "8. Return ONLY this format:\n"
            "   AI Score: [percentage]%\n"
            "   Flagged:\n"
            "   - [first 6 words of sentence 1]...\n"
            "   - [first 6 words of sentence 2]...\n"
            "   If no sentences are flagged, write: Flagged: none\n\n"
            "TEXT TO CHECK:\n\n{text}"
        ),
    },
]


def _clean_draft_for_detectors(text: str) -> str:
    """Strip all newlines and collapse whitespace into plain running text."""
    text = text.replace("\\n", " ")
    text = text.replace("\r\n", " ")
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = text.replace("/n", " ")
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def _split_sentences(text: str) -> list[str]:
    """Split essay text into individual sentences."""
    clean = _clean_draft_for_detectors(text)
    sentences = re.split(r'(?<=[.!?])\s+', clean)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]


def _match_fragment_to_sentence(fragment: str, sentences: list[str]) -> int | None:
    """Match a sentence fragment (first few words) to a full sentence.
    Returns the index into sentences, or None if no match."""
    fragment_clean = fragment.lower().strip().rstrip('.')
    # Remove trailing ellipsis
    fragment_clean = fragment_clean.rstrip('.').strip()
    words = fragment_clean.split()
    if len(words) < 2:
        return None

    best_idx = None
    best_score = 0

    for i, sentence in enumerate(sentences):
        s_lower = sentence.lower()
        s_words = s_lower.split()

        # Try matching first N words
        match_len = min(len(words), len(s_words))
        matching = sum(1 for a, b in zip(words[:match_len], s_words[:match_len]) if a == b)

        if matching >= 3 and matching > best_score:
            best_score = matching
            best_idx = i
        elif matching < 3 and len(words) >= 3:
            # Try substring match as fallback
            if fragment_clean[:20] in s_lower:
                if best_score < 3:
                    best_score = 3
                    best_idx = i

    return best_idx


def _parse_output(raw: str, sentences: list[str]) -> tuple[float, list[int]]:
    """Extract AI score and match flagged fragments back to sentence indices."""
    score = 0.0
    matches = re.findall(r'(\d{1,3}(?:\.\d+)?)\s*%', raw)
    for m in matches:
        val = float(m)
        if 0 < val <= 100:
            score = val
            break

    flagged_indices: list[int] = []

    in_flagged = False
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue

        lower = line.lower()
        if lower.startswith("flagged"):
            if "none" in lower:
                break
            in_flagged = True
            continue

        if in_flagged and (line.startswith("-") or line.startswith("•") or line.startswith("*")):
            fragment = line.lstrip('-•* ').strip().strip('"\'')
            # Remove trailing "..."
            fragment = re.sub(r'\.{2,}$', '', fragment).strip()
            if len(fragment) > 5:
                idx = _match_fragment_to_sentence(fragment, sentences)
                if idx is not None and idx not in flagged_indices:
                    flagged_indices.append(idx)

    return score, flagged_indices


async def _run_detector(
    bu_client: AsyncBrowserUse,
    detector: dict,
    clean_text: str,
    sentences: list[str],
    send: callable,
) -> dict:
    """Create a session, run detection, extract score and flagged sentence indices."""
    name = detector["name"]
    label = detector["label"]
    session_id = None

    try:
        session = await bu_client.sessions.create_session(
            keep_alive=True,
            start_url=detector["start_url"],
        )
        session_id = session.id
        _active_sessions.add(session_id)
        live_url = session.live_url or ""

        log.info(f"[{name}] Session created: {session_id}")

        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": "session created, scanning..."
        })

        await send({
            "type": "browser_url",
            "name": name,
            "url": live_url,
        })

        task_text = detector["task_template"].format(text=clean_text)

        task = await bu_client.tasks.create_task(
            task=task_text,
            llm="browser-use-llm",
            session_id=session_id,
        )

        log.info(f"[{name}] Task created, waiting (timeout={TASK_TIMEOUT_SECONDS}s)...")

        try:
            result = await asyncio.wait_for(
                task.complete(interval=2),
                timeout=TASK_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            log.warning(f"[{name}] Task timed out after {TASK_TIMEOUT_SECONDS}s")
            await send({
                "type": "agent_log",
                "agent": f"detector:{name}",
                "text": f"timed out after {TASK_TIMEOUT_SECONDS}s"
            })
            return {
                "name": name,
                "label": label,
                "score": 0.0,
                "flagged_indices": [],
                "raw_output": "timeout",
            }

        raw_output = result.output or ""
        log.info(f"[{name}] Done. output:\n{raw_output[:500]}")

        score, flagged_indices = _parse_output(raw_output, sentences)

        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": f"score: {score:.1f}%, {len(flagged_indices)} sentences flagged"
        })

        return {
            "name": name,
            "label": label,
            "score": score,
            "flagged_indices": flagged_indices,
            "raw_output": raw_output,
        }

    except Exception as e:
        detail = getattr(e, 'body', str(e))
        log.error(f"[{name}] Detector failed: {detail}")
        try:
            await send({
                "type": "agent_log",
                "agent": f"detector:{name}",
                "text": f"error: {str(detail)[:200]}"
            })
        except Exception:
            pass
        return {
            "name": name,
            "label": label,
            "score": 0.0,
            "flagged_indices": [],
            "raw_output": str(e),
        }
    finally:
        if session_id:
            _active_sessions.discard(session_id)
            try:
                await bu_client.sessions.delete_session(session_id)
                log.info(f"[{name}] Session {session_id} deleted")
            except Exception:
                pass


async def cleanup_all_sessions():
    """Force-kill every active Browser Use session."""
    global _bu_client
    if not _active_sessions and not _bu_client:
        return

    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    client = _bu_client or AsyncBrowserUse(api_key=api_key)

    session_ids = list(_active_sessions)
    if session_ids:
        log.info(f"Cleaning up {len(session_ids)} active sessions...")
        for sid in session_ids:
            try:
                await client.sessions.delete_session(sid)
                log.info(f"Killed session {sid}")
            except Exception as e:
                log.warning(f"Failed to kill session {sid}: {e}")
            finally:
                _active_sessions.discard(sid)

    try:
        resp = await client.sessions.list_sessions()
        for s in resp.items:
            if s.status == "active":
                try:
                    await client.sessions.delete_session(s.id)
                    log.info(f"Swept lingering session {s.id}")
                except Exception:
                    pass
    except Exception as e:
        log.warning(f"Session sweep failed: {e}")


async def run_detection(
    draft_text: str,
    send: callable,
) -> dict:
    """Run all detectors in parallel. Returns score and specific flagged sentences."""
    global _bu_client

    await cleanup_all_sessions()

    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    _bu_client = AsyncBrowserUse(api_key=api_key)

    clean_text = _clean_draft_for_detectors(draft_text)
    sentences = _split_sentences(draft_text)
    total = len(sentences)

    log.info(f"Sending {total} sentences to detectors (clean, no numbers)")

    gather_tasks = [
        asyncio.ensure_future(
            _run_detector(_bu_client, det, clean_text, sentences, send)
        )
        for det in DETECTORS
    ]

    try:
        results = await asyncio.gather(*gather_tasks, return_exceptions=True)
    except Exception:
        for t in gather_tasks:
            t.cancel()
        await cleanup_all_sessions()
        raise

    scores = {}
    detector_results = []
    all_flagged_indices: set[int] = set()

    for r in results:
        if isinstance(r, Exception):
            log.error(f"Detector gather exception: {r}")
            continue
        scores[r["name"]] = r["score"]
        all_flagged_indices.update(r.get("flagged_indices", []))
        detector_results.append(r)

    valid_scores = [s for s in scores.values() if s > 0]
    consensus = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

    # Map flagged indices back to actual sentence text
    flagged_with_sources = []
    for idx in sorted(all_flagged_indices):
        if 0 <= idx < len(sentences):
            flagged_by = [
                r["name"] for r in detector_results
                if idx in r.get("flagged_indices", [])
            ]
            flagged_with_sources.append({
                "text": sentences[idx],
                "flagged_by": flagged_by,
                "index": idx,
            })

    # Fallback: if score is high but no fragments matched, flag everything
    if consensus > 30 and len(flagged_with_sources) == 0:
        log.warning(f"Consensus {consensus:.1f}% but 0 matched sentences - flagging all")
        flagged_with_sources = [
            {"text": s, "flagged_by": ["fallback"], "index": i}
            for i, s in enumerate(sentences)
        ]

    verdict = "PASS" if consensus <= 10 else "REVISE"
    await send({
        "type": "agent_log",
        "agent": "consensus",
        "text": (
            f"avg {consensus:.1f}% AI, "
            f"{len(flagged_with_sources)}/{total} sentences flagged -> {verdict}"
        ),
    })

    return {
        "scores": scores,
        "consensus": consensus,
        "flagged_sentences": flagged_with_sources,
        "detector_results": detector_results,
    }
