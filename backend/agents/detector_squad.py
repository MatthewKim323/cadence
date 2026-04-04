from __future__ import annotations
import asyncio
import logging
import os
import re

from browser_use_sdk import AsyncBrowserUse

log = logging.getLogger("cadence")

DETECTORS = [
    {
        "name": "zerogpt",
        "label": "ZeroGPT",
        "start_url": "https://www.zerogpt.com",
        "task_template": (
            "You are on ZeroGPT.com. Follow these steps exactly:\n"
            "1. Find the large text input area on this page. Click on it.\n"
            "2. Type the ENTIRE text below into the text area. Do NOT skip any part.\n"
            "3. After the full text is entered, find and click the 'Detect Text' button.\n"
            "4. Wait for results to fully load — this may take 5-15 seconds.\n"
            "5. SCROLL DOWN on the page to see the full results section below the input.\n"
            "6. Read the AI-generated percentage shown in the results (e.g. '85.67% AI GPT').\n"
            "7. NOW THIS IS CRITICAL — look at the results text area carefully.\n"
            "   ZeroGPT highlights sentences it considers AI-generated with a YELLOW BACKGROUND color.\n"
            "   Sentences with NO highlight are considered human-written.\n"
            "   You MUST scroll through the ENTIRE results text and identify EVERY sentence\n"
            "   that has a yellow/highlighted background.\n"
            "   For each highlighted sentence, copy the EXACT text of that sentence.\n"
            "8. Return your findings in this format:\n"
            "   AI Score: [percentage]%\n"
            "   Flagged sentences:\n"
            "   - [exact text of first highlighted sentence]\n"
            "   - [exact text of second highlighted sentence]\n"
            "   - ... etc\n"
            "   If there are highlighted sentences, you MUST list them. Do NOT say '0 sentences flagged'\n"
            "   when there are clearly yellow-highlighted sentences visible.\n\n"
            "TEXT TO CHECK:\n\n{text}"
        ),
    },
    {
        "name": "originality",
        "label": "Originality.ai",
        "start_url": "https://originality.ai/ai-checker",
        "task_template": (
            "You are on the Originality.ai free AI checker page. Follow these steps exactly:\n"
            "1. Find the text input area on this page. Click on it.\n"
            "2. Type the ENTIRE text below into the text area. Do NOT skip any part.\n"
            "3. After the full text is entered, click the scan/check button.\n"
            "4. Wait for results to fully load — this may take 10-30 seconds.\n"
            "5. SCROLL DOWN to see the complete results below.\n"
            "6. Look at the RIGHT side of the results — there is an overall AI percentage score. Read this number.\n"
            "7. NOW look at the analyzed text. After scanning, Originality colors each sentence with a background:\n"
            "   - Sentences with a GREEN background = human. Ignore these.\n"
            "   - Sentences with a YELLOW/ORANGE background = risky. COUNT these as flagged.\n"
            "   - Sentences with a RED/PINK background = AI detected. COUNT these as flagged.\n"
            "   Look at EVERY sentence in the results and note its background color.\n"
            "   COUNT the total number of sentences that are NOT green.\n"
            "   For each non-green sentence, copy its EXACT text.\n"
            "8. Return your findings in this EXACT format:\n"
            "   AI Score: [percentage]%\n"
            "   Total flagged: [number] sentences\n"
            "   Flagged sentences:\n"
            "   - [exact sentence text] (red)\n"
            "   - [exact sentence text] (yellow)\n"
            "   - ... etc for every non-green sentence\n"
            "   IMPORTANT: If the AI score is above 50%, there MUST be flagged sentences. Do not return 0.\n\n"
            "TEXT TO CHECK:\n\n{text}"
        ),
    },
]


def _clean_draft_for_detectors(text: str) -> str:
    """Strip all newlines and collapse whitespace into plain running text.

    Browser Use agents type literal /n/n when they encounter newline characters
    in the task text, so we flatten everything to a single continuous paragraph.
    AI detectors don't need paragraph formatting — they analyze at the sentence level.
    """
    text = text.replace("\\n", " ")
    text = text.replace("\r\n", " ")
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = text.replace("/n", " ")
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def _parse_output(raw: str) -> tuple[float, list[str]]:
    """Extract AI score and flagged sentences from task output text."""
    score = 0.0
    matches = re.findall(r'(\d{1,3}(?:\.\d+)?)\s*%', raw)
    for m in matches:
        val = float(m)
        if 0 < val <= 100:
            score = val
            break

    flagged = []
    in_flagged_section = False

    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue

        lower = line.lower()
        if "flagged" in lower or "highlighted" in lower or "ai-generated" in lower or "ai detected" in lower:
            in_flagged_section = True
            continue

        if in_flagged_section or line.startswith("-") or line.startswith("•") or line.startswith("*"):
            sentence = line.lstrip('-•*0123456789.) ').strip()
            sentence = re.sub(r'\(AI likelihood:.*?\)', '', sentence).strip()
            sentence = re.sub(r'\((red|yellow|orange|green)\)', '', sentence, flags=re.IGNORECASE).strip()
            sentence = sentence.strip('"\'')
            if len(sentence) > 15:
                flagged.append(sentence)

    return score, flagged


async def _run_detector(
    bu_client: AsyncBrowserUse,
    detector: dict,
    draft_text: str,
    send: callable,
) -> dict:
    """Create a session, get live URL, run detection task, extract results."""
    name = detector["name"]
    label = detector["label"]
    session_id = None

    try:
        session = await bu_client.sessions.create_session(
            keep_alive=True,
            start_url=detector["start_url"],
        )
        session_id = session.id
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

        clean_text = _clean_draft_for_detectors(draft_text)
        task_text = detector["task_template"].format(text=clean_text)

        task = await bu_client.tasks.create_task(
            task=task_text,
            llm="browser-use-llm",
            session_id=session_id,
        )

        log.info(f"[{name}] Task created, waiting for completion...")

        result = await task.complete(interval=2)

        raw_output = result.output or ""
        log.info(f"[{name}] Done. Success={result.is_success}, output:\n{raw_output[:1000]}")

        score, flagged = _parse_output(raw_output)

        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": f"score: {score:.1f}%, {len(flagged)} sentences flagged"
        })

        return {
            "name": name,
            "label": label,
            "score": score,
            "flagged_sentences": flagged,
            "raw_output": raw_output,
        }

    except Exception as e:
        detail = getattr(e, 'body', str(e))
        log.error(f"[{name}] Detector failed: {detail}")
        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": f"error: {str(detail)[:200]}"
        })
        return {
            "name": name,
            "label": label,
            "score": 0.0,
            "flagged_sentences": [],
            "raw_output": str(e),
        }
    finally:
        if session_id:
            try:
                await bu_client.sessions.delete_session(session_id)
            except Exception:
                pass


async def run_detection(
    draft_text: str,
    send: callable,
) -> dict:
    """Run all detectors in parallel."""
    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    bu_client = AsyncBrowserUse(api_key=api_key)

    tasks = [
        _run_detector(bu_client, det, draft_text, send)
        for det in DETECTORS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    scores = {}
    all_flagged: list[str] = []
    detector_results = []

    for r in results:
        if isinstance(r, Exception):
            log.error(f"Detector gather exception: {r}")
            continue
        scores[r["name"]] = r["score"]
        all_flagged.extend(r["flagged_sentences"])
        detector_results.append(r)

    unique_flagged = list(dict.fromkeys(all_flagged))
    valid_scores = [s for s in scores.values() if s > 0]
    consensus = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

    verdict = "PASS" if consensus <= 10 else "REVISE"
    await send({
        "type": "agent_log",
        "agent": "consensus",
        "text": f"avg {consensus:.1f}%, {len(unique_flagged)} unique sentences flagged -> {verdict}",
    })

    flagged_with_sources = []
    for sentence in unique_flagged:
        flagged_by = [
            r["name"] for r in detector_results
            if sentence in r["flagged_sentences"]
        ]
        flagged_with_sources.append({
            "text": sentence,
            "flagged_by": flagged_by,
            "index": unique_flagged.index(sentence),
        })

    return {
        "scores": scores,
        "consensus": consensus,
        "flagged_sentences": flagged_with_sources,
        "detector_results": detector_results,
    }
