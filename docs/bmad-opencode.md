# BMAD for OpenCode

> **Deprecated**: Team workflow defined at `../../opencode_profile/.opencode/agents/orchestrator.md` supersedes this. Kept as historical reference.

## Purpose

This repository uses BMAD as a lightweight execution workflow so cheaper models handle most of the reading, summarizing, and documentation work while stronger models are reserved for hard debugging and final review.

BMAD in this repo means:

1. Brief
2. Mapping
3. Architecture
4. Delivery
5. Review

It is a workflow, not a required package or plugin.

## Delegation Model

BMAD in this repo assumes a main-agent-plus-subagent workflow.

- `AGENTS.md` defines the repository policy for when to delegate.
- The main agent remains responsible for final implementation, verification, and git actions.
- `explore` is the preferred mapping subagent.
- `general` is the preferred review and research subagent.

This is policy guidance, not a hard runtime router.

- The available subagent types come from the OpenCode runtime.
- The main agent must explicitly invoke subagents through runtime tools.
- Exact model-per-subagent routing may not be directly configurable in the current runtime.
- When runtime routing is not enforceable, use the routing table as governance and audit intent.

## Model Lanes

- `gpt mini`: very short summaries, checklists, prompt cleanup, handoff drafts.
- `Minimax M2.5 free`: repo exploration, docs, flow summaries, first-pass issue mapping.
- `gpt-5.3 codex`: coding lane for local fixes, refactors, APIs, and implementation loops.
- `opencode/big-pickle`: primary model for all work.
- `gpt-5.5`: architecture lane for large redesigns or milestone-level audit.

## Default Routing

Use these defaults unless the task clearly needs a stronger lane:

- Brief: `opencode/big-pickle`
- Mapping: `opencode/big-pickle`
- Architecture: `opencode/big-pickle`
- Delivery: `opencode/big-pickle`
- Review: `opencode/big-pickle`

## Escalation Rules

All work uses `opencode/big-pickle`. No escalation needed.

## Repo-Specific Guidance

### Firmware

- Mapping: `opencode/big-pickle`
- Delivery: `opencode/big-pickle`
- Review: `opencode/big-pickle`

### Backend

- Mapping: `opencode/big-pickle`
- Delivery: `opencode/big-pickle`
- Review: `opencode/big-pickle`

### Assistant Bot

- Mapping: `opencode/big-pickle`
- Delivery: `opencode/big-pickle`
- Review: `opencode/big-pickle`

### Docs and Handoff

- Use `opencode/big-pickle`

## Pilot For Current Work

Current pilot task in this repo:

1. restore stable ESP32 connectivity to the Docker-only Mosquitto broker
2. verify telemetry resumes through the backend
3. retry the latest policy-gated OTA release
4. verify whether OTA reaches `downloading` and `success`

Recommended lane split:

- Brief: `opencode/big-pickle`
- Mapping: `opencode/big-pickle`
- Architecture: `opencode/big-pickle`
- Delivery: `opencode/big-pickle`
- Review: `opencode/big-pickle`

## Measuring Effectiveness

Use these simple checks to judge whether BMAD is paying off:

1. All work uses `opencode/big-pickle`.
2. No lane splitting needed.
3. The change still verified cleanly under the normal repo workflow.
4. The next handoff is easier to resume because the phase, lane, and escalation trigger are explicit.

Track this with `docs/bmad-scorecard.md` after any non-trivial session.

## Handoff Additions

For non-trivial work, `docs/handoff.md` should include:

- current BMAD phase
- recommended model lane
- escalation trigger

That keeps the next session from restarting with the most expensive model by default.
