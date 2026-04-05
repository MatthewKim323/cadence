from __future__ import annotations

import json
import os

from uagents import Agent, Context, Protocol

from protocols.messages import DigestRequest, DigestResult

digester_agent = Agent(
    name="Cadence Profile Digester",
    seed=os.getenv("DIGESTER_SEED", "cadence-profile-digester-seed-v1"),
    port=8002,
    endpoint=["http://127.0.0.1:8002/submit"],
    mailbox=True,
    publish_agent_details=True,
    network="testnet",
)

proto = Protocol(name="digester")


@proto.on_message(DigestRequest)
async def handle_digest(ctx: Context, sender: str, msg: DigestRequest):
    ctx.logger.info(f"Digesting profile for session {msg.session_id[:16]}...")

    try:
        raw = json.loads(msg.cadence_json)
        profile = raw.get("profile", raw)

        fingerprint = {
            "writing_rules": profile.get("writing_rules", []),
            "metrics": profile.get("metrics", {}),
            "signature_phrases": profile.get("signature_phrases", []),
            "avoided_patterns": profile.get("avoided_patterns", []),
            "exemplar_passages": profile.get("exemplar_passages", []),
        }

        ctx.logger.info(
            f"Parsed {len(fingerprint['writing_rules'])} rules, "
            f"{len(fingerprint['exemplar_passages'])} exemplars"
        )

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        ctx.logger.error(f"Failed to parse .cadence: {e}")
        fingerprint = {
            "writing_rules": [],
            "metrics": {},
            "signature_phrases": [],
            "avoided_patterns": [],
            "exemplar_passages": [],
        }

    await ctx.send(
        sender,
        DigestResult(
            fingerprint_json=json.dumps(fingerprint),
            session_id=msg.session_id,
        ),
    )


digester_agent.include(proto, publish_manifest=True)
