#!/usr/bin/env python3
"""
Diagnostic: run JUST the orchestrator with verbose mailbox/debug logging
to see exactly what the mailbox client is doing.
"""
import logging
import os
import sys

# Enable DEBUG for everything mailbox-related
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(name)-30s %(levelname)-7s %(message)s")
logging.getLogger("mailbox").setLevel(logging.DEBUG)
logging.getLogger("uagents").setLevel(logging.DEBUG)
logging.getLogger("uagents.registration").setLevel(logging.DEBUG)
logging.getLogger("aiohttp").setLevel(logging.DEBUG)

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from orchestrators.longform_orchestrator import longform_agent

print(f"\n  Address:    {longform_agent.address}")
print(f"  Identifier: {longform_agent.identifier}")
print(f"  Agent type: {longform_agent.agent_type}")
print(f"\n  Running with DEBUG logging — watch for mailbox poll activity...\n")

longform_agent.run()
