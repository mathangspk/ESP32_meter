# BMAD for OpenCode

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
- `gpt-5.4`: hard debugging lane for firmware, MQTT, OTA, timing, and final risk review.
- `gpt-5.5`: architecture lane for large redesigns or milestone-level audit.

## Default Routing

Use these defaults unless the task clearly needs a stronger lane:

- Brief: `gpt mini` or `Minimax M2.5 free`
- Mapping: `Minimax M2.5 free`
- Architecture: `gpt-5.3 codex` for small scoped changes, `gpt-5.4` for risky runtime work
- Delivery: `gpt-5.3 codex`
- Review: `gpt-5.4`

Only use `gpt-5.5` when the task changes system boundaries or long-term platform direction.

## Escalation Rules

Move from a cheaper lane to `gpt-5.4` when any of these apply:

- firmware and backend behavior are coupled
- the issue involves MQTT reconnect, OTA delivery, Wi-Fi, or timing
- there are at least two credible root causes
- the first patch does not verify cleanly
- the task needs a stronger pre-commit risk pass

Move from `gpt-5.4` to `gpt-5.5` only when:

- the task changes architecture across firmware, backend, bot, or deployment
- a milestone needs a broader design audit than a normal code review

## Repo-Specific Guidance

### Firmware

- Mapping: `Minimax M2.5 free`
- Delivery: `gpt-5.3 codex`
- Review: `gpt-5.4`

Use `gpt-5.4` early when the issue is about MQTT reconnect, OTA state transitions, or unexpected device runtime behavior.

### Backend

- Mapping: `Minimax M2.5 free`
- Delivery: `gpt-5.3 codex`
- Review: `gpt-5.4` for multi-file or runtime-sensitive changes

### Assistant Bot

- Mapping: `Minimax M2.5 free`
- Delivery: `gpt-5.3 codex` for code, `gpt mini` for text-only changes
- Review: `gpt-5.4` only for sensitive action flows or cross-service impact

### Docs and Handoff

- Use `gpt mini` or `Minimax M2.5 free`
- Avoid spending `gpt-5.4` or `gpt-5.5` budget here unless the docs encode a risky operational decision

## Pilot For Current Work

Current pilot task in this repo:

1. restore stable ESP32 connectivity to the Docker-only Mosquitto broker
2. verify telemetry resumes through the backend
3. retry the latest policy-gated OTA release
4. verify whether OTA reaches `downloading` and `success`

Recommended lane split:

- Brief: `gpt mini`
- Mapping: `Minimax M2.5 free`
- Architecture: `gpt-5.4`
- Delivery: `gpt-5.3 codex`
- Review: `gpt-5.4`

## Measuring Effectiveness

Use these simple checks to judge whether BMAD is paying off:

1. Most repo reading and docs work stayed on `gpt mini` or `Minimax M2.5 free`.
2. `gpt-5.4` was used only for hard debugging or final review.
3. The change still verified cleanly under the normal repo workflow.
4. The next handoff is easier to resume because the phase, lane, and escalation trigger are explicit.

Track this with `docs/bmad-scorecard.md` after any non-trivial session.

## Handoff Additions

For non-trivial work, `docs/handoff.md` should include:

- current BMAD phase
- recommended model lane
- escalation trigger

That keeps the next session from restarting with the most expensive model by default.
