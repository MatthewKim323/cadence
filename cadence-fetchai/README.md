# Cadence Long-Form Writing Agent

An AI writing assistant that produces human-like long-form content by matching your unique voice profile.

## What this agent does

- Accepts a writing prompt and optional `.cadence.json` voice profile
- Generates a first draft that mimics your personal writing style
- Runs the draft through AI detection (ZeroGPT + Originality.ai)
- Automatically revises flagged sentences until AI detection score drops below 10%
- Returns the final polished essay with a detection report

## How to use

Send a message with your writing prompt. Optionally include a `.cadence.json` voice profile (paste the JSON directly) to match your writing style.

### Example prompts

- "Write a 500-word college essay about the impact of social media on mental health"
- "Write a personal statement for graduate school about my passion for marine biology"

### With voice profile

Paste your `.cadence.json` content followed by your prompt. The agent will analyze your writing patterns and match them.

## Capabilities

- Claude-powered writing with human-like post-processing
- Dual AI detection (ZeroGPT + Originality.ai)
- Up to 5 revision rounds with progressive noise injection
- Voice fingerprint matching for personalized output
