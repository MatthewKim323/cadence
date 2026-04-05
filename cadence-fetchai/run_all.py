"""
Cadence Multi-Agent System — runs all 5 agents as separate processes.
Each agent gets its own port and mailbox (no Bureau, which kills mailbox mode).
"""
import os
import signal
import subprocess
import sys
import time

from dotenv import load_dotenv

load_dotenv()

AGENTS = [
    ("Orchestrator", "orchestrators.longform_orchestrator", "longform_agent", 8001),
    ("Digester", "agents.profile_digester", "digester_agent", 8002),
    ("Writer", "agents.longform_writer", "writer_agent", 8003),
    ("ZeroGPT", "agents.zerogpt_detector", "zerogpt_agent", 8004),
    ("Originality", "agents.originality_detector", "originality_agent", 8005),
]

processes: list[subprocess.Popen] = []


def _agent_script(module: str, var: str) -> str:
    return (
        f"import os, sys; "
        f"sys.path.insert(0, '{os.getcwd()}'); "
        f"os.chdir('{os.getcwd()}'); "
        f"from dotenv import load_dotenv; load_dotenv(); "
        f"from {module} import {var}; "
        f"{var}.run()"
    )


def shutdown(*_):
    print("\nShutting down all agents...")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    for p in processes:
        try:
            p.wait(timeout=5)
        except Exception:
            p.kill()
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

if __name__ == "__main__":
    print("\n=== CADENCE MULTI-AGENT SYSTEM (Fetch.ai) ===\n")

    for label, module, var, port in AGENTS:
        proc = subprocess.Popen(
            [sys.executable, "-c", _agent_script(module, var)],
            cwd=os.getcwd(),
        )
        processes.append(proc)
        print(f"  {label:14s}  port {port}  pid {proc.pid}")

    print(f"\n  All 5 agents running. Press Ctrl+C to stop.\n")
    print("==============================================\n")

    while True:
        for i, p in enumerate(processes):
            ret = p.poll()
            if ret is not None:
                label = AGENTS[i][0]
                print(f"  WARNING: {label} exited with code {ret}, restarting...")
                module, var, port = AGENTS[i][1], AGENTS[i][2], AGENTS[i][3]
                new_proc = subprocess.Popen(
                    [sys.executable, "-c", _agent_script(module, var)],
                    cwd=os.getcwd(),
                )
                processes[i] = new_proc
                print(f"  {label} restarted (pid {new_proc.pid})")
        time.sleep(5)
