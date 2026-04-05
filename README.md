# cadence.

> your voice, preserved.

Cadence is a multi-agent AI platform that preserves your writing voice. It analyzes how you write — your rhythm, word choices, sentence structure, the things that make your writing *yours* — then generates new content that sounds exactly like you while passing AI detection.

**DiamondHacks 2026 @ UCSD**

---

## what it does

**Writing Studio** — Upload past writing, describe what you need, and Cadence writes essays, papers, and reports that match your voice. Watch the full pipeline live: voice fingerprinting, draft streaming, parallel AI detection across ZeroGPT and Originality.ai, and iterative revision until the draft passes.

**Communication Studio** — Upload emails and messages. Cadence learns your messaging style — brevity, tone, emoji habits. A Browser Use agent reads your Gmail inbox and drafts replies in your voice.

**Voice Interview** — No writing samples? A 5-minute ElevenLabs ConversationalAI interview builds your voice profile from how you speak, think, and explain.

**Fetch.ai Pipeline** — The long-form writing pipeline runs as 5 autonomous agents on Agentverse, accessible through ASI:One chat. Attach your voice profile PDF, describe what you need, and the agents coordinate: digest → write → detect → revise.

---

## architecture

```
frontend/          React 18 + Vite
backend/           FastAPI + WebSockets
cadence-fetchai/   Fetch.ai uAgents (5 agents on Agentverse)
```

### the pipeline

```
voice fingerprint → claude writer → noise injection → browser use detectors → consensus
                         ↑                                                        │
                         └──── revise flagged sentences (max 5 iterations) ←──────┘
```

### agents

| agent | framework | what it does |
|-------|-----------|-------------|
| Voice Analyst | Claude | Builds structured voice fingerprint from writing samples |
| Writer | Claude Sonnet | Generates and revises drafts guided by fingerprint |
| ZeroGPT Detector | Browser Use | Navigates zerogpt.com, scrapes AI score + flagged sentences |
| Originality Detector | Browser Use | Navigates originality.ai, scrapes AI score + flagged sentences |
| Inbox Agent | Browser Use | Reads Gmail inbox, sends replies through live browser |
| Interview Analyst | Claude | Converts voice interview transcript into fingerprint |
| Comm Writer | Claude | Drafts email replies matching communication voice |

### fetch.ai agents (ASI:One)

| agent | port | role |
|-------|------|------|
| Long-Form Orchestrator | 8001 | User-facing on ASI:One, coordinates pipeline |
| Profile Digester | 8002 | Parses voice profiles into fingerprints |
| Long-Form Writer | 8003 | Claude-powered draft generation + revision |
| ZeroGPT Detector | 8004 | Browser Use AI detection via zerogpt.com |
| Originality Detector | 8005 | Browser Use AI detection via originality.ai |

---

## humanization engine

Two-stage approach to making AI-generated text pass detection:

**Stage 1 — Structural post-processing** (`_humanize_text`):
- Replace AI sentence starters (Furthermore, Moreover) with "And" / "But"
- Inject comma splices, ellipsis on reflective sentences
- Drop Oxford commas randomly, strip em-dashes
- Break tricolon patterns (AI loves groups of three)

**Stage 2 — Progressive noise injection** (`_inject_noise`, intensity 1→5):
- Cyrillic homoglyphs (Latin `a` → Cyrillic `а`) — visually identical, breaks tokenization
- Zero-width spaces between words — invisible, disrupts token boundaries
- Double words, contraction swaps, comma drops — human-like errors

---

## tech stack

| layer | tech |
|-------|------|
| Frontend | React, Framer Motion, Three.js (particle + dither shaders), jsPDF |
| Backend | FastAPI, WebSockets, Anthropic SDK, Browser Use Cloud SDK |
| Database | Supabase (Postgres, Auth, Storage) |
| Voice | ElevenLabs ConversationalAI |
| AI Detection | Browser Use → ZeroGPT, Originality.ai (no APIs — real browser scraping) |
| Multi-Agent | Fetch.ai uagents, Agentverse, ASI:One Chat Protocol |
| PDF | PyMuPDF (extraction), jsPDF (generation) |

---

## running locally

### frontend
```bash
cd frontend
npm install
npm run dev
```

### backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### fetch.ai agents
```bash
cd cadence-fetchai
pip install -r requirements.txt
python3 run_all.py
```

### environment variables

**backend/.env**
```
ANTHROPIC_API_KEY=
BROWSER_USE_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GMAIL_PROFILE_ID=          # from setup_gmail_profile.py
```

**cadence-fetchai/.env**
```
ANTHROPIC_API_KEY=
BROWSER_USE_API_KEY=
AGENTVERSE_API_KEY=
```

---

## voice profile export

The webapp generates structured PDFs that can be used with the Fetch.ai pipeline:

- **writing.cadence.pdf** — writing rules, metrics, signature phrases, exemplar passages
- **comms.cadence.pdf** — email style, response patterns, communication rules
- **interview.cadence.pdf** — personality, speech patterns, vocabulary, transcript

Attach to ASI:One chat → orchestrator downloads + extracts text → passes to writer as style guide.

---

## hackathon tracks

**The Scholar's Spellbook (Education)** — Voice discovery as education. Students learn what makes their writing unique. The live pipeline is a real-time writing lesson.

**Best Use of Browser Use** — Two parallel Browser Use agents scraping AI detection sites with no APIs. Per-sentence flagging from live DOM elements. Gmail automation through real browser sessions.

**Best Use of Fetch.ai** — 5 agents on Agentverse with ASI:One Chat Protocol. Multi-agent coordination with write-detect-revise loop. PDF attachment handling via ResourceContent.

---

built by matthew kim for diamondhacks 2026.
