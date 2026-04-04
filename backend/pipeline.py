from __future__ import annotations
import traceback
from utils.pdf_extract import fetch_document_texts
from agents.voice_analyst import analyze_voice
from agents.writer import write_draft
from agents.detector_squad import run_detection

MAX_ITERATIONS = 5
PASS_THRESHOLD = 10.0


async def run_writing_pipeline(
    prompt: str,
    document_ids: list[str],
    user_id: str,
    send: callable,
):
    """Full writing pipeline: voice analysis -> write/detect/revise loop."""
    try:
        await send({"type": "status", "phase": "profiling"})

        doc_texts = await fetch_document_texts(document_ids, user_id)
        if not doc_texts:
            await send({"type": "error", "message": "No documents found. Upload writing samples first."})
            return

        await send({
            "type": "agent_log",
            "agent": "system",
            "text": f"extracted text from {len(doc_texts)} documents"
        })

        fingerprint = await analyze_voice(doc_texts, send)

        current_draft = ""
        iteration_history = []

        for iteration in range(1, MAX_ITERATIONS + 1):
            await send({"type": "status", "phase": "writing", "iteration": iteration})
            await send({
                "type": "agent_log",
                "agent": "system",
                "text": f"--- iteration {iteration} ---"
            })

            if iteration == 1:
                current_draft = await write_draft(prompt, fingerprint, send)
            else:
                last = iteration_history[-1]
                revision_info = {
                    "current_draft": current_draft,
                    "flagged_sentences": last["flagged_sentences"],
                }
                current_draft = await write_draft(prompt, fingerprint, send, revision_info)

            await send({"type": "status", "phase": "detecting", "iteration": iteration})

            detection = await run_detection(current_draft, send)

            iter_data = {
                "round": iteration,
                "scores": detection["scores"],
                "consensus": detection["consensus"],
                "flagged_count": len(detection["flagged_sentences"]),
                "flagged_sentences": detection["flagged_sentences"],
            }
            iteration_history.append(iter_data)

            await send({
                "type": "detection",
                "scores": detection["scores"],
                "consensus": detection["consensus"],
                "flagged_count": len(detection["flagged_sentences"]),
                "iteration": iteration,
            })

            if detection["consensus"] <= PASS_THRESHOLD:
                await send({
                    "type": "complete",
                    "draft": current_draft,
                    "iterations": len(iteration_history),
                    "final_consensus": detection["consensus"],
                    "history": [
                        {
                            "round": h["round"],
                            "scores": h["scores"],
                            "consensus": h["consensus"],
                            "flagged_count": h["flagged_count"],
                        }
                        for h in iteration_history
                    ],
                })
                return

            await send({"type": "status", "phase": "revising", "iteration": iteration})
            await send({
                "type": "revising",
                "flagged_sentences": [
                    {"text": s["text"], "index": s["index"]}
                    for s in detection["flagged_sentences"]
                ],
                "iteration": iteration,
            })

        await send({
            "type": "complete",
            "draft": current_draft,
            "iterations": len(iteration_history),
            "final_consensus": iteration_history[-1]["consensus"] if iteration_history else 0,
            "history": [
                {
                    "round": h["round"],
                    "scores": h["scores"],
                    "consensus": h["consensus"],
                    "flagged_count": h["flagged_count"],
                }
                for h in iteration_history
            ],
            "max_iterations_reached": True,
        })

    except Exception as e:
        if "PipelineCancelled" in type(e).__name__:
            raise
        traceback.print_exc()
        try:
            await send({"type": "error", "message": str(e)})
        except Exception:
            pass
