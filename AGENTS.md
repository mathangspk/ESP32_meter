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
