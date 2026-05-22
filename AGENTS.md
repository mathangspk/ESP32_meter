# Project Context

## Start Here

Read first:
1. `PROJECT_CONTEXT.md`
2. `docs/handoff.md`

These are source of truth for hardware, current runtime state, verified results, and next step.

## Workflow

All projects share the same team workflow defined at `../../opencode_profile/.opencode/agents/orchestrator.md`:

- Review Gate / BMAD Flow
- Delegation to specialist agents
- Model routing
- Verification rules
- Commit and push policy
- Handoff format

## Project-specific facts

- Board: `esp32doit-devkit-v1`
- Framework: Arduino (PlatformIO)
- Serial monitor speed: `115200`
- Upload port (macOS): `/dev/cu.SLAB_USBtoUART`
- PZEM UART pins: `RX=GPIO16, TX=GPIO17`
- Meter: `PZEM-004T v3.0`

Useful commands:
- `pio run` — build firmware
- `pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART` — upload
- `pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200` — serial monitor

## Current debug order (unless user reprioritises)

1. Confirm PZEM readings under real load.
2. Restore MQTT connectivity and confirm publish success.
3. Restore NTP synchronisation.
4. Reduce debug logging for normal operation.
5. Run longer stability check.

## Handoff rule

After each verified milestone, update `docs/handoff.md` with:
- what was confirmed
- what changed
- remaining issues
- exact next step
- most relevant command or log evidence

Use the team workflow's handoff format from `../../opencode_profile/.opencode/agents/orchestrator.md`.

## Compact rule

When context compaction is needed, do not restate full project history.

1. Point next agent to `PROJECT_CONTEXT.md`, `docs/handoff.md`, and latest git commits as stable source of truth.
2. Summarise only delta since the last `docs/handoff.md` update or last compact.
3. Include only active task, files changed in current session, uncommitted changes, verification done, blockers, and exact next step.
4. Do not repeat long confirmed-state/history lists already stored in docs unless they changed.
5. If stable docs are stale, update `docs/handoff.md` first, then compact with a short delta.

Target compact size: under 2,000 tokens unless user explicitly asks for full archive.
