from __future__ import annotations
import asyncio
import os
import re
import json
import httpx

BROWSER_USE_API = "https://api.browser-use.com/api/v1"

DETECTORS = [
    {
        "name": "gptzero",
        "url": "https://gptzero.me",
        "task": (
            "Go to https://gptzero.me. Find the text input area and paste the following text into it, "
            "then click the button to check/detect. Wait for results to fully load. "
            "Extract the overall AI probability percentage and list any sentences that are highlighted or flagged as AI-generated. "
            "Return the results."
        ),
    },
    {
        "name": "zerogpt",
        "url": "https://www.zerogpt.com",
        "task": (
            "Go to https://www.zerogpt.com. Find the text input area and paste the following text into it, "
            "then click the detect button. Wait for results to load fully. "
            "Extract the AI percentage score and list any sentences highlighted as AI-generated. "
            "Return the results."
        ),
    },
    {
        "name": "originality",
        "url": "https://originality.ai/ai-checker",
        "task": (
            "Go to https://originality.ai/ai-checker (the free scanner). Find the text input area and paste the following text, "
            "then click scan/check. Wait for results. "
            "Extract the AI score percentage and any flagged sentences. "
            "Return the results."
        ),
    },
]


async def _create_session(client: httpx.AsyncClient, api_key: str) -> dict:
    resp = await client.post(
        f"{BROWSER_USE_API}/browser/create",
        headers={"Authorization": f"Bearer {api_key}"},
        json={},
    )
    resp.raise_for_status()
    return resp.json()


async def _run_task(
    client: httpx.AsyncClient,
    api_key: str,
    browser_id: str,
    task_text: str,
) -> dict:
    resp = await client.post(
        f"{BROWSER_USE_API}/run-task",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "task": task_text,
            "browser_id": browser_id,
        },
        timeout=180.0,
    )
    resp.raise_for_status()
    return resp.json()


async def _stop_session(client: httpx.AsyncClient, api_key: str, browser_id: str):
    try:
        await client.post(
            f"{BROWSER_USE_API}/browser/{browser_id}/stop",
            headers={"Authorization": f"Bearer {api_key}"},
        )
    except Exception:
        pass


def _parse_score(raw_output: str) -> tuple[float, list[str]]:
    """Best-effort extraction of AI score and flagged sentences from task output."""
    score = 0.0
    score_match = re.search(r'(\d{1,3}(?:\.\d+)?)\s*%', raw_output)
    if score_match:
        score = float(score_match.group(1))

    flagged = []
    for line in raw_output.split("\n"):
        line = line.strip()
        if line.startswith("-") or line.startswith("•") or line.startswith("*"):
            sentence = line.lstrip("-•* ").strip()
            if len(sentence) > 15:
                flagged.append(sentence)

    return score, flagged


async def _run_detector(
    client: httpx.AsyncClient,
    api_key: str,
    detector: dict,
    draft_text: str,
    send: callable,
) -> dict:
    """Create a browser session, run the detection task, parse results."""
    name = detector["name"]
    label = "GPTZero" if name == "gptzero" else "ZeroGPT" if name == "zerogpt" else "Originality.ai"

    session = await _create_session(client, api_key)
    browser_id = session.get("browser_id", session.get("id", ""))
    share_url = session.get("live_url", session.get("share_url", ""))

    await send({
        "type": "agent_log",
        "agent": f"detector:{name}",
        "text": f"session created, scanning..."
    })

    await send({
        "type": "browser_url",
        "name": name,
        "url": share_url,
    })

    task_text = detector["task"] + f"\n\nTEXT TO ANALYZE:\n\n{draft_text}"

    try:
        result = await _run_task(client, api_key, browser_id, task_text)
        raw = result.get("output", result.get("result", str(result)))
        if isinstance(raw, dict):
            raw = json.dumps(raw)
        score, flagged = _parse_score(raw)
    except Exception as e:
        await send({
            "type": "agent_log",
            "agent": f"detector:{name}",
            "text": f"error: {str(e)[:100]}"
        })
        score = 0.0
        flagged = []
        raw = str(e)

    await _stop_session(client, api_key, browser_id)

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
        "raw_output": raw,
    }


async def run_detection(
    draft_text: str,
    send: callable,
) -> dict:
    """Run all 3 detectors in parallel and return aggregated results."""
    api_key = os.getenv("BROWSER_USE_API_KEY", "")

    async with httpx.AsyncClient(timeout=200.0) as client:
        tasks = [
            _run_detector(client, api_key, det, draft_text, send)
            for det in DETECTORS
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    scores = {}
    all_flagged = []
    detector_results = []

    for r in results:
        if isinstance(r, Exception):
            continue
        scores[r["name"]] = r["score"]
        all_flagged.extend(r["flagged_sentences"])
        detector_results.append(r)

    unique_flagged = list(dict.fromkeys(all_flagged))
    valid_scores = [s for s in scores.values() if s > 0]
    consensus = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

    await send({
        "type": "agent_log",
        "agent": "consensus",
        "text": (
            f"avg {consensus:.1f}%, {len(unique_flagged)} unique sentences flagged"
            f" -> {'PASS' if consensus <= 10 else 'REVISE'}"
        ),
    })

    flagged_with_sources = []
    for sentence in unique_flagged:
        flagged_by = []
        for r in detector_results:
            if sentence in r["flagged_sentences"]:
                flagged_by.append(r["name"])
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
