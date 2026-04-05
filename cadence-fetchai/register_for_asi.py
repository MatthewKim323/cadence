#!/usr/bin/env python3
"""
Register all 5 Cadence agents using the official register_chat_agent function.
This makes them ASI:One compatible and visible on Agentverse.
"""
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from uagents_core.utils.registration import (
    AgentverseRequestError,
    RegistrationRequestCredentials,
    register_chat_agent,
)

API_KEY = os.getenv("AGENTVERSE_API_KEY")
if not API_KEY:
    print("ERROR: AGENTVERSE_API_KEY not set in .env")
    sys.exit(1)

AGENTS = [
    {
        "name": "Cadence Long-Form Orchestrator",
        "seed": os.getenv("ORCHESTRATOR_SEED", "cadence-longform-orchestrator-seed-v1"),
        "description": (
            "AI writing assistant that produces human-like essays matching your "
            "voice profile, with built-in AI detection evasion. Attach a .cadence.pdf "
            "voice profile and describe what you want written."
        ),
    },
    {
        "name": "Cadence Profile Digester",
        "seed": os.getenv("DIGESTER_SEED", "cadence-profile-digester-seed-v1"),
        "description": (
            "Parses raw Cadence voice profile JSON into a structured fingerprint "
            "used by the writing pipeline to match a user's writing style."
        ),
    },
    {
        "name": "Cadence Long-Form Writer",
        "seed": os.getenv("WRITER_SEED", "cadence-longform-writer-seed-v1"),
        "description": (
            "Generates long-form essays using Claude, guided by a voice fingerprint "
            "to match the user's writing style. Handles both initial drafts and revisions."
        ),
    },
    {
        "name": "Cadence ZeroGPT Detector",
        "seed": os.getenv("ZEROGPT_SEED", "cadence-zerogpt-detector-seed-v1"),
        "description": (
            "Runs AI detection on draft text using ZeroGPT via Browser Use Cloud. "
            "Returns AI score percentage and flagged sentences."
        ),
    },
    {
        "name": "Cadence Originality Detector",
        "seed": os.getenv("ORIGINALITY_SEED", "cadence-originality-detector-seed-v1"),
        "description": (
            "Runs AI detection on draft text using Originality.ai via Browser Use Cloud. "
            "Returns AI score percentage and flagged sentences."
        ),
    },
]

readme_path = os.path.join(os.path.dirname(__file__), "README.md")
readme = open(readme_path).read() if os.path.exists(readme_path) else ""

print(f"Registering {len(AGENTS)} agents for ASI:One...\n")

for agent in AGENTS:
    credentials = RegistrationRequestCredentials(
        agent_seed_phrase=agent["seed"],
        agentverse_api_key=API_KEY,
    )

    print(f"  {agent['name']}")
    print(f"    Seed: {agent['seed'][:30]}...")

    try:
        result = register_chat_agent(
            name=agent["name"],
            endpoint="https://agentverse.ai/v2/agents/mailbox/submit",
            active=True,
            credentials=credentials,
            track_interactions=True,
            description=agent["description"],
            readme=readme,
        )
        print(f"    Result: {result}")
        print(f"    OK\n")
    except AgentverseRequestError as e:
        print(f"    FAILED: {e}\n")

print("Done. All agents should now show as ASI:One compatible on Agentverse.")
