from __future__ import annotations
import json
import logging
import os
import traceback
from dotenv import load_dotenv

load_dotenv()

import httpx
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import create_client

from pipeline import run_writing_pipeline
from comms_pipeline import run_comms_pipeline
from agents.detector_squad import cleanup_all_sessions
from agents.inbox_agent import cleanup_inbox_session, send_reply_in_gmail


class PipelineCancelled(Exception):
    pass


logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cadence")

app = FastAPI(title="Cadence Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_supabase_url = os.getenv("SUPABASE_URL", "")
_supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
_elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")
_elevenlabs_agent_id = os.getenv("ELEVENLABS_AGENT_ID", "")


def _verify_token(token: str) -> str | None:
    """Verify a Supabase JWT and return the user_id, or None."""
    try:
        sb = create_client(_supabase_url, _supabase_service_key)
        user = sb.auth.get_user(token)
        log.info(f"Token verified for user: {user.user.id}")
        return user.user.id
    except Exception as e:
        log.error(f"Token verification failed: {e}")
        return None


@app.websocket("/ws/pipeline")
async def pipeline_ws(ws: WebSocket):
    await ws.accept()
    log.info("WebSocket accepted")

    try:
        raw = await ws.receive_text()
        payload = json.loads(raw)

        auth_token = payload.get("auth_token", "")
        prompt = payload.get("prompt", "")
        document_ids = payload.get("document_ids", [])

        log.info(f"Received payload — prompt length: {len(prompt)}, doc_ids: {document_ids}, token length: {len(auth_token)}")

        user_id = _verify_token(auth_token)
        if not user_id:
            log.error("Auth failed — closing connection")
            await ws.send_json({"type": "error", "message": "Authentication failed. Try logging out and back in."})
            await ws.close()
            return

        if not prompt:
            log.error("No prompt — closing")
            await ws.send_json({"type": "error", "message": "No prompt provided"})
            await ws.close()
            return

        if not document_ids:
            log.error("No document_ids — closing")
            await ws.send_json({"type": "error", "message": "No documents selected"})
            await ws.close()
            return

        log.info(f"Starting pipeline for user {user_id} with {len(document_ids)} docs")

        disconnected = False

        async def send(msg: dict):
            nonlocal disconnected
            if disconnected:
                raise PipelineCancelled()
            try:
                await ws.send_json(msg)
            except Exception:
                disconnected = True
                raise PipelineCancelled()

        await run_writing_pipeline(
            prompt=prompt,
            document_ids=document_ids,
            user_id=user_id,
            send=send,
        )

        log.info("Pipeline completed")

    except PipelineCancelled:
        log.info("Pipeline cancelled — client disconnected, cleaning up sessions...")
        await cleanup_all_sessions()
    except WebSocketDisconnect:
        log.info("Client disconnected, cleaning up sessions...")
        await cleanup_all_sessions()
    except Exception as e:
        log.error(f"Pipeline exception: {e}\n{traceback.format_exc()}")
        await cleanup_all_sessions()
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass


@app.websocket("/ws/comms")
async def comms_ws(ws: WebSocket):
    await ws.accept()
    log.info("Comms WebSocket accepted")

    disconnected = False

    async def send(msg: dict):
        nonlocal disconnected
        if disconnected:
            raise PipelineCancelled()
        try:
            await ws.send_json(msg)
        except Exception:
            disconnected = True
            raise PipelineCancelled()

    try:
        raw = await ws.receive_text()
        payload = json.loads(raw)

        auth_token = payload.get("auth_token", "")
        document_ids = payload.get("document_ids", [])

        log.info(f"Comms payload — doc_ids: {document_ids}, token length: {len(auth_token)}")

        user_id = _verify_token(auth_token)
        if not user_id:
            log.error("Comms auth failed — closing")
            await ws.send_json({"type": "error", "message": "Authentication failed."})
            await ws.close()
            return

        if not document_ids:
            log.error("Comms no document_ids — closing")
            await ws.send_json({"type": "error", "message": "No communication samples selected."})
            await ws.close()
            return

        log.info(f"Starting comms pipeline for user {user_id} with {len(document_ids)} docs")

        await run_comms_pipeline(
            document_ids=document_ids,
            user_id=user_id,
            send=send,
        )

        log.info("Comms pipeline completed — waiting for user actions")

        # Keep connection open for send_reply actions
        while True:
            try:
                raw_msg = await ws.receive_text()
                msg = json.loads(raw_msg)
                action = msg.get("action", "")

                if action == "send_reply":
                    reply_id = msg.get("reply_id", "")
                    sender = msg.get("sender", "")
                    subject = msg.get("subject", "")
                    reply_text = msg.get("reply_text", "")

                    log.info(f"Send reply action — to: {sender}, subject: {subject}")

                    success = await send_reply_in_gmail(
                        sender=sender,
                        subject=subject,
                        reply_text=reply_text,
                        send=send,
                    )

                    if success:
                        await send({
                            "type": "reply_sent",
                            "id": reply_id,
                            "sender": sender,
                        })
                    else:
                        await send({
                            "type": "reply_failed",
                            "id": reply_id,
                            "sender": sender,
                            "reason": "Browser agent could not complete the reply",
                        })

            except WebSocketDisconnect:
                log.info("Comms client disconnected during action phase")
                break
            except json.JSONDecodeError:
                continue
            except PipelineCancelled:
                break
            except Exception as e:
                log.error(f"Comms action error: {e}")
                break

    except PipelineCancelled:
        log.info("Comms pipeline cancelled, cleaning up...")
    except WebSocketDisconnect:
        log.info("Comms client disconnected, cleaning up...")
    except Exception as e:
        log.error(f"Comms exception: {e}\n{traceback.format_exc()}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        await cleanup_inbox_session()
        try:
            await ws.close()
        except Exception:
            pass


def _extract_bearer(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


@app.get("/api/voice-interview/signed-url")
async def voice_interview_signed_url(request: Request):
    token = _extract_bearer(request)
    if not token:
        return JSONResponse({"error": "Missing auth token"}, status_code=401)

    user_id = _verify_token(token)
    if not user_id:
        return JSONResponse({"error": "Invalid auth token"}, status_code=401)

    if not _elevenlabs_api_key or not _elevenlabs_agent_id:
        return JSONResponse({"error": "ElevenLabs not configured"}, status_code=500)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id={_elevenlabs_agent_id}",
            headers={"xi-api-key": _elevenlabs_api_key},
        )

    if resp.status_code != 200:
        log.error(f"ElevenLabs signed URL failed: {resp.status_code} {resp.text}")
        return JSONResponse({"error": "Failed to get signed URL from ElevenLabs"}, status_code=502)

    data = resp.json()
    return {"signed_url": data.get("signed_url", "")}


@app.post("/api/voice-session")
async def save_voice_session(request: Request):
    token = _extract_bearer(request)
    if not token:
        return JSONResponse({"error": "Missing auth token"}, status_code=401)

    user_id = _verify_token(token)
    if not user_id:
        return JSONResponse({"error": "Invalid auth token"}, status_code=401)

    body = await request.json()
    transcript = body.get("transcript", "")
    duration = body.get("duration_seconds", 0)
    conversation_id = body.get("conversation_id", "")

    if not transcript:
        return JSONResponse({"error": "No transcript provided"}, status_code=400)

    fingerprint = None
    try:
        from agents.interview_analyst import analyze_interview
        fingerprint = await analyze_interview(transcript)
        log.info(f"Generated interview fingerprint for user {user_id}")
    except Exception as e:
        log.error(f"Interview fingerprint generation failed: {e}")

    try:
        sb = create_client(_supabase_url, _supabase_service_key)
        row: dict = {
            "user_id": user_id,
            "transcript": transcript,
            "duration_seconds": duration,
        }
        if fingerprint:
            row["fingerprint_json"] = fingerprint

        try:
            row["conversation_id"] = conversation_id
            result = sb.table("voice_sessions").insert(row).execute()
        except Exception:
            row.pop("conversation_id", None)
            result = sb.table("voice_sessions").insert(row).execute()

        session_id = result.data[0]["id"] if result.data else None
        log.info(f"Saved voice session for user {user_id} ({duration}s)")
        return {"status": "ok", "session_id": session_id, "fingerprint": fingerprint}
    except Exception as e:
        log.error(f"Failed to save voice session: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/health")
async def health():
    return {"status": "ok"}
