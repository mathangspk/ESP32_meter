# Development Setup

## Tooling

- `PlatformIO`
- `Arduino` framework through PlatformIO
- USB serial access for `/dev/cu.SLAB_USBtoUART`

## Common Commands

```bash
pio run
pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART
pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200
```

## Fresh Machine Workflow

1. Clone the repository.
2. Open the repo in OpenCode.
3. Read `PROJECT_CONTEXT.md` and `docs/handoff.md` first.
4. Build once with `pio run`.
5. Upload with `pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART` if hardware is connected.
6. Verify runtime behavior from serial output.

## OpenCode Workflow

Repository workflow is tracked in `AGENTS.md`.

Portable project state is tracked in:

- `PROJECT_CONTEXT.md`
- `docs/handoff.md`
- `docs/debug-runbook.md`

Do not rely on local-only files under `.git/` for project state.
