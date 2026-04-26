# BMAD Scorecard

Use this file to measure whether BMAD is improving cost discipline and execution quality on real work.

## How To Use

After a non-trivial session, append one block using the template below.

## Metrics

- `cheap_steps`: count of steps done with `gpt mini` or `Minimax M2.5 free`
- `build_steps`: count of steps done with `gpt-5.3 codex`
- `deep_steps`: count of steps done with `gpt-5.4` or `gpt-5.5`
- `escalations`: number of times work moved to a stronger lane
- `files_changed`: number of files changed in the session
- `verify_commands`: commands run to verify the result
- `verify_passed`: `yes` or `no`
- `rework_loops`: number of failed fix attempts before the final path
- `handoff_updated`: `yes` or `no`

## Targets

- `cheap_steps >= deep_steps`
- `gpt-5.4` is used only for architecture, hard debugging, or review
- `verify_passed = yes`
- `handoff_updated = yes`
- `rework_loops` trends down over time on similar task types

## Template

```text
Date:
Task:
BMAD path:
  Brief:
  Mapping:
  Architecture:
  Delivery:
  Review:
Model usage:
  cheap_steps:
  build_steps:
  deep_steps:
  escalations:
Execution:
  files_changed:
  verify_commands:
  verify_passed:
  rework_loops:
Handoff:
  handoff_updated:
Result:
  outcome:
  notes:
```

## Current Pilot Entry

```text
Date: 2026-04-26
Task: Add BMAD workflow-only policy to the repo and use it on the MQTT local-broker fix
BMAD path:
  Brief: define a low-cost multi-model workflow for this repo
  Mapping: inspect AGENTS.md, PROJECT_CONTEXT.md, docs/handoff.md, MQTT runtime state
  Architecture: choose workflow-only BMAD and local host relay for Docker Mosquitto reachability
  Delivery: update repo docs, switch Mosquitto host port to 1884, add local relay scripts
  Review: verify routing docs, backend health, relay listener, MQTT pub/sub through 1883
Model usage:
  cheap_steps: 4
  build_steps: 2
  deep_steps: 2
  escalations: 1
Execution:
  files_changed: 6
  verify_commands: curl /healthz; lsof -iTCP:1883; mosquitto_pub/sub through 127.0.0.1:1883
  verify_passed: partial
  rework_loops: 1
Handoff:
  handoff_updated: yes
Result:
  outcome: BMAD policy is active in the repo and the Docker-only broker path is reachable through the host relay
  notes: final success still depends on live ESP32 reconnect telemetry after the relay change
```

## 2026-04-26 MQTT Recovery Session

```text
Date: 2026-04-26
Task: Restore live ESP32 MQTT connectivity to the local Docker-backed broker and verify OTA can progress again
BMAD path:
  Brief: fix the live rc=-2 MQTT failure on SN005 without giving the expensive model the entire session
  Mapping: inspect broker ports, relay state, device logs, subnet mismatch, and backend device health
  Architecture: correct the network path first, then recover firmware connectivity with an optional forced-WiFi build path
  Delivery: add forced-WiFi firmware fallback, upload a local recovery build, verify MQTT recovery, then retry OTA
  Review: confirm backend online state, broker connection, and OTA progression to downloading
Model usage:
  cheap_steps: 5
  build_steps: 4
  deep_steps: 2
  escalations: 1
Execution:
  files_changed: 5
  verify_commands: pio run; pio run -t upload; curl /devices/SN005/health; short serial capture; curl /ota/jobs/<jobId>
  verify_passed: yes
  rework_loops: 2
Handoff:
  handoff_updated: yes
Result:
  outcome: MQTT connectivity was restored and OTA moved from published-only to received and downloading
  notes: the agent serial read still reboots the board, so final OTA success should be verified without touching the serial port during transfer
```

## 2026-04-26 OTA Success Session

```text
Date: 2026-04-26
Task: Finish the GitHub-hosted OTA success path and stabilize NTP plus MQTT runtime behavior
BMAD path:
  Brief: push the live ESP32 from MQTT recovery through a verified OTA success path
  Mapping: inspect OTA firmware code, backend release URL flow, serial traces, broker behavior, and MongoDB job state
  Architecture: resolve expiring GitHub URLs in the backend, remove crashing OTA preflight logic, and move OTA work to a larger stack task
  Delivery: patch backend URL resolution, patch firmware NTP and OTA paths, upload firmware, and run repeated OTA verification attempts
  Review: confirm final OTA job success, new firmware version on the device, and backend online health after reboot
Model usage:
  cheap_steps: 4
  build_steps: 6
  deep_steps: 3
  escalations: 2
Execution:
  files_changed: 6
  verify_commands: pio run; pio run -t upload; curl /healthz; curl /devices/SN005/health; curl /ota/jobs/<jobId>; controlled serial traces
  verify_passed: yes
  rework_loops: 4
Handoff:
  handoff_updated: yes
Result:
  outcome: OTA success path is now verified end-to-end and the device reports firmware 1.0.1-ota-verification-3
  notes: serial access from the agent still reboots the board, so future stability runs should minimize serial reads
```

## 2026-04-26 Telegram Analytics Session

```text
Date: 2026-04-26
Task: Add backend analytics summary and natural-language Telegram Q&A for energy, peak-hour, and current readings
BMAD path:
  Brief: support natural-language power questions while keeping numeric calculations in the backend
  Mapping: inspect firmware UTC timestamps, Mongo telemetry storage, site metadata, and assistant-bot Groq flow
  Architecture: keep UTC storage, add site timezone, expose one analytics summary endpoint, and let Groq handle intent plus phrasing
  Delivery: patch backend analytics summary logic and wire assistant-bot natural-language analytics routing
  Review: verify TypeScript builds for backend and assistant-bot after the new endpoint and bot flow changes
Model usage:
  cheap_steps: 3
  build_steps: 4
  deep_steps: 1
  escalations: 0
Execution:
  files_changed: 7
  verify_commands: npm run build (backend); npm run build (assistant-bot)
  verify_passed: yes
  rework_loops: 0
Handoff:
  handoff_updated: yes
Result:
  outcome: backend and bot now support a single analytics summary path and natural-language Telegram question handling for current readings and same-day usage analytics
  notes: live Telegram verification still remains, especially for device disambiguation, inventory questions, and real data phrasing
```
