#!/usr/bin/env python3
"""Drain all pending messages from the orchestrator's mailbox."""
import asyncio
import os
from datetime import datetime, timezone
from secrets import token_bytes

import aiohttp
from dotenv import load_dotenv

load_dotenv()

from uagents_core.config import AgentverseConfig
from uagents_core.identity import Identity, derive_key_from_seed
from uagents_core.storage import compute_attestation

SEED = os.getenv("ORCHESTRATOR_SEED", "cadence-longform-orchestrator-seed-v1")
identity = Identity.from_seed(SEED, 0)
agentverse = AgentverseConfig()
agents_api = agentverse.agents_api


def get_attestation():
    now = datetime.now(timezone.utc)
    return compute_attestation(
        identity=identity, validity_start=now,
        validity_secs=60000, nonce=token_bytes(nbytes=32),
    )


async def drain():
    async with aiohttp.ClientSession() as session:
        while True:
            att = get_attestation()
            async with session.get(
                f"{agents_api}/{identity.address}/mailbox",
                headers={"Authorization": f"Agent {att}"},
            ) as resp:
                if resp.status != 200:
                    print(f"Poll returned {resp.status}, done.")
                    break
                items = await resp.json()
                if not items:
                    print("Mailbox empty.")
                    break
                print(f"Found {len(items)} messages, deleting...")
                for item in items:
                    uuid = item["uuid"]
                    async with session.delete(
                        f"{agents_api}/{identity.address}/mailbox/{uuid}",
                        headers={"Authorization": f"Agent {att}"},
                    ) as dr:
                        status = "ok" if dr.status < 300 else f"err:{dr.status}"
                        print(f"  Deleted {uuid[:8]}... ({status})")

    print("Mailbox drained.")

asyncio.run(drain())
