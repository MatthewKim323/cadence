#!/usr/bin/env python3
"""
One-time setup: runs each agent standalone so the Agentverse Inspector
can reach it and you can connect a mailbox. After all mailboxes are
connected, use run_all.py for normal operation.
"""
import os
import subprocess
import sys
from urllib.parse import quote

from dotenv import load_dotenv

load_dotenv()

AGENTS = [
    ("Orchestrator", "orchestrators.longform_orchestrator", "longform_agent", 8001),
    ("Digester", "agents.profile_digester", "digester_agent", 8002),
    ("Writer", "agents.longform_writer", "writer_agent", 8003),
    ("ZeroGPT", "agents.zerogpt_detector", "zerogpt_agent", 8004),
    ("Originality", "agents.originality_detector", "originality_agent", 8005),
]

print("\n=== CADENCE MAILBOX SETUP ===")
print("This runs each agent one at a time so you can connect mailboxes.\n")

for i, (label, module, var, port) in enumerate(AGENTS, 1):
    print(f"\n{'='*60}")
    print(f"  [{i}/5] {label} (port {port})")
    print(f"{'='*60}")

    agent_script = f"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath("{__file__}")).replace("setup_mailboxes.py", ""))
os.chdir("{os.getcwd()}")
from dotenv import load_dotenv
load_dotenv()
from {module} import {var}
from urllib.parse import quote
uri = quote(f"http://127.0.0.1:{port}", safe="")
print(f"\\n  ADDRESS: {{{var}.address}}")
print(f"  INSPECTOR: https://agentverse.ai/inspect/?uri={{uri}}&address={{{var}.address}}\\n")
{var}.run()
"""

    proc = subprocess.Popen(
        [sys.executable, "-c", agent_script],
        cwd=os.getcwd(),
    )

    print(f"\n  Starting {label}... watch the output above for the Inspector link.")
    print(f"  Steps:")
    print(f"    1. Copy the INSPECTOR link from the agent output above")
    print(f"    2. Open it in your browser")
    print(f"    3. Click 'Connect' -> select 'Mailbox'")
    print(f"    4. Come back here and press Enter")

    input(f"\n  Press Enter when {label} mailbox is connected...")

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()

    print(f"  {label} stopped.\n")

print("\n=== ALL DONE ===")
print("Mailboxes are set up. Now run normally with:")
print("  python3 run_all.py\n")
