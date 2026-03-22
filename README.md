# ClaudexCouncil

> Make LLMs debate so you don't have to.

ClaudexCouncil orchestrates brainstorming sessions between **Claude Code** and **Codex CLI**. One proposes, the other critiques, and they iterate until a refined answer emerges.

## How it works

```
You → prompt → Claude (proposer) → Codex (critic) → Claude (refines) → ... → Final Synthesis
```

Each round, the proposer generates or improves ideas while the critic challenges them. After N rounds, Claude synthesizes everything into a final, consolidated answer.

## Install

```bash
npx claudex-council "your prompt"
```

Or install globally:

```bash
npm install -g claudex-council
```

## Prerequisites

Both CLI tools must be installed and authenticated:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — `npm install -g @anthropic-ai/claude-code`
- [Codex CLI](https://github.com/openai/codex) — `npm install -g @openai/codex`

## Usage

```bash
# Basic — 3 rounds by default
claudex-council "How should I architect a distributed cache?"

# More rounds
claudex-council -r 5 "REST vs GraphQL for a mobile-first project?"

# See each round's response in real-time
claudex-council -v "Database migration strategies"

# Save the full transcript
claudex-council -s "Microservices vs monolith trade-offs"

# All options combined
claudex-council -r 5 -s -v -o ./my-transcripts "Your complex question here"
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-r, --rounds <n>` | `3` | Number of exchange rounds (max 10) |
| `-s, --save-transcript` | `false` | Save full transcript as markdown |
| `-o, --output <dir>` | `./transcripts/` | Transcript output directory |
| `-v, --verbose` | `false` | Show each round's response in real-time |

## Example output

```
💡 Round 1/3 — Claude (proposer)    ✔
🔍 Round 2/3 — Codex (critic)      ✔
💡 Round 3/3 — Claude (proposer)    ✔
📝 Generating final synthesis...    ✔

════════════════════════════════════════════════════════════
[Final synthesized answer here]
════════════════════════════════════════════════════════════
```

## Roles

| Role | LLM | Behavior |
|------|-----|----------|
| **Proposer** | Claude | Creative, constructive — generates ideas and integrates feedback |
| **Critic** | Codex | Demanding but fair — finds flaws, suggests alternatives |
| **Synthesizer** | Claude | Balanced — consolidates the best of all rounds |

## Transcripts

With `-s`, a markdown transcript is saved with the full conversation:

```
transcripts/council-2026-03-22-231500.md
```

On errors or interrupts (Ctrl+C), a partial transcript is always saved so no work is lost.

## License

MIT
