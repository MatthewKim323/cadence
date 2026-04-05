#!/usr/bin/env python3
"""
Directly poll the orchestrator's mailbox using the same auth the agent uses.
This bypasses the agent entirely to check if the mailbox is reachable.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from secrets import token_bytes

import aiohttp
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

from uagents_core.config import AgentverseConfig
from uagents_core.identity import Identity, derive_key_from_seed
from uagents_core.storage import compute_attestation

SEED = os.getenv("ORCHESTRATOR_SEED", "cadence-longform-orchestrator-seed-v1")

key = derive_key_from_seed(SEED, "", 0)
identity = Identity.from_seed(SEED, 0)

agentverse = AgentverseConfig()
agents_api = agentverse.agents_api
mailbox_url = f"{agents_api}/{identity.address}/mailbox"

now = datetime.now(timezone.utc)
attestation = compute_attestation(
    identity=identity,
    validity_start=now,
    validity_secs=60000,
    nonce=token_bytes(nbytes=32),
)

print(f"Agent address: {identity.address}")
print(f"Agents API:    {agents_api}")
print(f"Mailbox URL:   {mailbox_url}")
print(f"Attestation:   {attestation[:40]}...")
print()


async def poll():
    async with aiohttp.ClientSession() as session:
        print(f"[{datetime.now()}] Polling mailbox...")
        async with session.get(
            mailbox_url,
            headers={"Authorization": f"Agent {attestation}"},
        ) as resp:
            print(f"  Status: {resp.status}")
            text = await resp.text()
            print(f"  Body:   {text[:500]}")
            if resp.status == 200:
                import json
                items = json.loads(text)
                print(f"  Messages in mailbox: {len(items)}")
                for i, item in enumerate(items):
                    print(f"    [{i}] uuid={item.get('uuid', '?')}, received={item.get('received_at', '?')}")
            elif resp.status == 404:
                print("  >>> MAILBOX NOT FOUND — needs to be created via Inspector")
            else:
                print(f"  >>> UNEXPECTED STATUS — mailbox may not be working")


async def continuous_poll():
    print("Polling every 3 seconds. Send a message on ASI:One and watch...\n")
    for i in range(30):
        await poll()
        print()
        await asyncio.sleep(3)

asyncio.run(continuous_poll())
