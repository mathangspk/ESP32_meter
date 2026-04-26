# AGENTS.md

## Start Here

Before making changes in this repository, read these files first:

1. `PROJECT_CONTEXT.md`
2. `docs/handoff.md`

These files are the source of truth for the current hardware setup, recent verification results, and the next debugging step.

## Project Workflow

Use this order unless the user asks for something different:

1. Inspect the relevant code and current repo state.
2. Make the smallest correct change.
3. Verify the change.
4. Commit the milestone.
5. Push the milestone.
6. Update `docs/handoff.md`.

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
