#!/usr/bin/env python3
"""
Register the orchestrator using the official register_chat_agent function.
This is the documented way to make agents ASI:One compatible.
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

SEED = os.getenv("ORCHESTRATOR_SEED", "cadence-longform-orchestrator-seed-v1")
API_KEY = os.getenv("AGENTVERSE_API_KEY")

if not API_KEY:
    print("ERROR: AGENTVERSE_API_KEY not set in .env")
    sys.exit(1)

readme = open(os.path.join(os.path.dirname(__file__), "README.md")).read()

credentials = RegistrationRequestCredentials(
    agent_seed_phrase=SEED,
    agentverse_api_key=API_KEY,
)

print(f"Registering orchestrator for ASI:One with register_chat_agent...")
print(f"  Seed: {SEED[:20]}...")
print(f"  API key: {API_KEY[:30]}...")

try:
    result = register_chat_agent(
        name="Cadence Long-Form Orchestrator",
        endpoint="https://agentverse.ai/v2/agents/mailbox/submit",
        active=True,
        credentials=credentials,
        track_interactions=True,
        description="AI writing assistant that produces human-like essays matching your voice profile, with built-in AI detection evasion.",
        readme=readme,
    )
    print(f"\nRegistration result: {result}")
    print("Agent should now be ASI:One compatible!")
except AgentverseRequestError as e:
    print(f"\nRegistration failed: {e}")
    if e.from_exc:
        print(f"Underlying error: {e.from_exc}")
