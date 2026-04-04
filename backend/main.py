from __future__ import annotations
import json
import logging
import os
import traceback
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client

from pipeline import run_writing_pipeline
from comms_pipeline import run_comms_pipeline, run_compose
from agents.detector_squad import cleanup_all_sessions
from agents.inbox_agent import cleanup_inbox_session


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

        await run_comms_pipeline(
            document_ids=document_ids,
            user_id=user_id,
            send=send,
        )

        log.info("Comms pipeline completed")

    except PipelineCancelled:
        log.info("Comms pipeline cancelled, cleaning up...")
        await cleanup_inbox_session()
    except WebSocketDisconnect:
        log.info("Comms client disconnected, cleaning up...")
        await cleanup_inbox_session()
    except Exception as e:
        log.error(f"Comms exception: {e}\n{traceback.format_exc()}")
        await cleanup_inbox_session()
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass


@app.post("/api/compose")
async def compose_endpoint(request: Request):
    """REST endpoint for compose mode. Returns a voice-matched email draft."""
    from fastapi.responses import JSONResponse

    body = await request.json()
    auth_token = body.get("auth_token", "")
    document_ids = body.get("document_ids", [])
    recipient = body.get("recipient", "")
    relationship = body.get("relationship", "peer")
    intent = body.get("intent", "")

    user_id = _verify_token(auth_token)
    if not user_id:
        return JSONResponse({"error": "Authentication failed."}, status_code=401)

    if not intent:
        return JSONResponse({"error": "No intent provided."}, status_code=400)

    logs: list[dict] = []

    async def send(msg: dict):
        logs.append(msg)

    try:
        draft = await run_compose(
            document_ids=document_ids,
            user_id=user_id,
            recipient=recipient,
            relationship=relationship,
            intent=intent,
            send=send,
        )
        return {"draft": draft, "logs": logs}
    except Exception as e:
        log.error(f"Compose failed: {e}\n{traceback.format_exc()}")
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/health")
async def health():
    return {"status": "ok"}
