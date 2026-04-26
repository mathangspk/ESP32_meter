# AGENTS.md

## Start Here

Before making changes in this repository, read these files first:

1. `PROJECT_CONTEXT.md`
2. `docs/handoff.md`

These files are the source of truth for the current hardware setup, recent verification results, and the next debugging step.

## Project Workflow

Use this order unless the user asks for something different:

1. Inspect the relevant code and current repo state.
2. Run the task through the BMAD phases below.
3. Make the smallest correct change.
4. Verify the change.
5. Commit the milestone.
6. Push the milestone.
7. Update `docs/handoff.md`.

## BMAD Workflow

Use this lightweight BMAD flow for OpenCode work in this repository:

1. Brief
2. Mapping
3. Architecture
4. Delivery
5. Review

Expected output per phase:

- Brief: restate the goal, acceptance criteria, and what is out of scope.
- Mapping: identify the relevant files, runtime state, logs, and likely failure points.
- Architecture: choose the smallest correct approach and the verification order.
- Delivery: make the change, verify it, and keep the scope narrow.
- Review: check for regressions, operational risk, and missing verification.

Do not skip straight to Delivery for non-trivial work unless the task is already fully obvious from the current repo state.

## Delegation Policy

Treat this file as a delegation policy, not as a runtime scheduler.

- The main agent owns final planning, implementation decisions, verification decisions, commit/push steps, and handoff updates.
- Use `explore` before non-trivial cross-file work when the relevant code path is not already fully known.
- Mapping work should default to `explore`.
- Use `explore` for open-ended repo mapping, file discovery, endpoint tracing, schema tracing, and call-flow discovery.
- Use `general` for cross-file review, operational risk review, tradeoff research, and broader reasoning after an implementation pass.
- Use `ops-light` for simple Git chores such as `git status`, `git diff`, `git log`, `git add`, `git commit`, and `git push` when that subagent is available in the runtime.
- Do not use subagents for single-file trivial edits or obvious local changes.
- For firmware plus backend plus bot interactions, do a mapping pass first instead of jumping straight into code edits.
- After non-trivial multi-file changes, run a separate review pass before treating the work as complete.

## Phase Ownership

- Brief: main agent
- Mapping: prefer `explore`
- Architecture: main agent
- Delivery: main agent
- Review: prefer `general` for non-trivial or runtime-sensitive work

The main agent may skip delegation only when the scope is already fully known and the work is trivially local.

## Subagent Contracts

When delegating work, the main agent must provide a concrete task contract.

### `explore`

Use for repo exploration and mapping.

Required prompt inputs:

- task goal
- relevant feature area or path hints
- desired thoroughness level
- whether the subagent is read-only or may propose edits
- exact output format expected back

Expected output:

- relevant files
- key functions, endpoints, or flows
- likely failure points or risk points
- open questions if the map is still incomplete

### `general`

Use for review, research, and broad reasoning.

Required prompt inputs:

- problem statement or review target
- affected areas
- whether the task is research-only or review-only
- exact output format expected back
- verification expectations if applicable

Expected output:

- findings or conclusions
- severity or confidence where relevant
- recommended next action
- testing or verification gaps

### `ops-light`

Use for simple Git housekeeping when supported by the current OpenCode runtime.

Required prompt inputs:

- the exact Git outcome needed
- any commit scope restrictions
- whether push is requested
- exact output format expected back

Expected output:

- relevant Git status or diff summary
- commit result if one was requested
- push result if one was requested
- any Git safety blockers

## Visibility Rules

Delegation should be visible in the session.

- Before calling a subagent, the main agent must send a short commentary update naming the subagent, why it is being used, and what output is expected.
- After a subagent returns, the main agent must summarize the result and explain how it affects the next step.
- Keep delegation commentary short and operational. Do not dump the full prompt to the user unless they ask.
- If a task is completed entirely in the main agent, say so only when that choice is notable or relevant.

## Runtime Limits

Be explicit about what this file can and cannot do.

- `AGENTS.md` defines repository policy and delegation guidance. It does not itself spawn or route agents.
- Available subagent types come from the OpenCode runtime, not from this repository.
- The main agent must explicitly invoke subagents through runtime tools.
- Model-per-subagent routing may not be directly configurable in the current runtime.
- When exact model routing is not enforceable, treat the routing table in this repo as governance and audit intent rather than a hard guarantee.

## Model Routing Policy

Default to cheaper models first and escalate only when needed.

- `gpt mini`: short rewrites, checklists, quick summaries, handoff draft text.
- `Minimax M2.5 free`: repo mapping, docs, code-flow summaries, first-pass bug hypotheses.
- `gpt-5.3 codex`: code changes, small refactors, endpoint work, tight fix loops.
- `gpt-5.4`: hard debugging, firmware plus backend interactions, cross-file reasoning, final risk review.
- `gpt-5.5`: major architecture changes, broad redesign, milestone-level audit.

Repository defaults:

- Firmware MQTT and OTA work: map with `Minimax M2.5 free`, implement with `gpt-5.3 codex`, review with `gpt-5.4`.
- Backend and bot feature work: map with `Minimax M2.5 free`, implement with `gpt-5.3 codex`, review with `gpt-5.4` only when the change crosses multiple areas or affects runtime safety.
- Docs and handoff work: prefer `gpt mini` or `Minimax M2.5 free`.

Escalate to `gpt-5.4` only when one or more of these are true:

- the task touches firmware and backend together
- the failure involves timing, reconnect, OTA, or network state
- there are multiple plausible root causes
- the first implementation path did not verify cleanly
- a pre-commit review needs a stronger risk pass

Escalate to `gpt-5.5` only when the task changes system boundaries, deployment shape, or long-term architecture.

## Verification Rules

Do not treat a change as complete until the relevant checks pass.

- Firmware changes: run `pio run`
- Device changes: upload with `pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART`
- Runtime checks: inspect serial output with `pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200` or an equivalent direct serial read
- Network changes: verify the expected Wi-Fi, MQTT, or HTTP behavior from logs or the remote endpoint

## Commit And Push Policy

- Commit only after a milestone is verified.
- Keep commits scoped to one technical outcome.
- Push after each successful milestone so the repo can be restored easily later.
- Do not force-push.
- Do not rewrite history unless the user explicitly asks for it.

Example milestone commit themes:

- `debug: confirm live PZEM readings`
- `fix: restore MQTT connectivity`
- `fix: restore NTP sync`
- `chore: reduce runtime log noise`

## Current Debug Order

Follow this order unless the user reprioritizes:

1. Confirm PZEM readings under a real electrical load.
2. Restore MQTT connectivity and confirm publish success.
3. Restore NTP synchronization.
4. Reduce debug logging for normal operation.
5. Run a longer stability check.

## Operational Notes

- ESP32 board: `esp32doit-devkit-v1`
- Serial monitor speed: `115200`
- Current upload port on this machine: `/dev/cu.SLAB_USBtoUART`
- Current UART pins used for PZEM in code: `GPIO16` and `GPIO17`

## Handoff Rule

After each verified milestone, update `docs/handoff.md` with:

- what was confirmed
- what changed
- remaining issues
- exact next step
- the most relevant command or log evidence
- current BMAD phase
- recommended model lane
- escalation trigger if the next step gets stuck

After each non-trivial session, append or update an entry in `docs/bmad-scorecard.md` so BMAD cost, escalation, and verification quality can be measured over time.
