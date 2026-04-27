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

## 2026-04-27 OTA HTTP Client Split

```text
Date: 2026-04-27
Task: Restore production OTA when firmware URL is served over plain HTTP from VPS debug host
BMAD path:
  Brief: make OTA succeed end-to-end again after serial logs showed SSL client failure on an HTTP URL
  Mapping: inspect DataSender OTA payload handling, OTAUpdate client selection, current handoff state, and live VPS firmware host path
  Architecture: keep HTTPS support, add HTTP client path with minimal branching, and preserve OTA status metadata across async task boundaries
  Delivery: patch firmware, build clean images, upload v9 by USB, host v10 on VPS, and trigger live OTA job
  Review: confirm serial success trace, backend final job state, and post-reboot firmware version in device health
Model usage:
  cheap_steps: 2
  build_steps: 5
  deep_steps: 1
  escalations: 1
Execution:
  files_changed: 4
  verify_commands: pio run -t clean -c platformio.ota.ini; OTA_FIRMWARE_VERSION=1.0.1-ota-verification-9 pio run -c platformio.ota.ini -t upload --upload-port /dev/cu.SLAB_USBtoUART; OTA_FIRMWARE_VERSION=1.0.1-ota-verification-10 pio run -c platformio.ota.ini; curl -I http://113.161.220.166:8081/esp32-meter-1.0.1-ota-verification-10.bin; curl /ota/jobs/<jobId>; curl /devices/SN005/health; controlled serial trace
  verify_passed: yes
  rework_loops: 1
Handoff:
  handoff_updated: yes
Result:
  outcome: production OTA now succeeds over VPS-hosted short HTTP URL and device reports firmware 1.0.1-ota-verification-10 after reboot
  notes: root cause was using WiFiClientSecure for every OTA URL; firmware now uses WiFiClient for HTTP and WiFiClientSecure for HTTPS
```

## 2026-04-27 OTA Non-Serial Confidence Pass

```text
Date: 2026-04-27
Task: Prove OTA still succeeds without USB serial attached, then remove temporary public firmware host
BMAD path:
  Brief: confirm OTA no longer depends on serial-assisted timing and close temporary debug exposure when proof exists
  Mapping: inspect current device health, hosted firmware path, and active VPS debug container state
  Architecture: build one more OTA image, trigger direct job over backend only, verify through API state transitions, then remove host container
  Delivery: build v11, host artifact, create OTA job, poll backend state, and delete `esp32-firmware-host`
  Review: confirm final OTA job success, device health on v11, and failed connection to port 8081 after removal
Model usage:
  cheap_steps: 1
  build_steps: 4
  deep_steps: 1
  escalations: 0
Execution:
  files_changed: 2
  verify_commands: OTA_FIRMWARE_VERSION=1.0.1-ota-verification-11 pio run -c platformio.ota.ini; curl -I http://113.161.220.166:8081/esp32-meter-1.0.1-ota-verification-11.bin; curl /ota/jobs/<jobId>; curl /devices/SN005/health; docker rm -f esp32-firmware-host; curl -I http://113.161.220.166:8081/...
  verify_passed: yes
  rework_loops: 0
Handoff:
  handoff_updated: yes
Result:
  outcome: non-serial OTA confidence pass succeeded and temporary public firmware host was removed
  notes: direct HTTP-hosted debug path is no longer exposed on VPS after verification
```

## 2026-04-27 OTA HTTPS GitHub Recheck

```text
Date: 2026-04-27
Task: Re-verify production OTA over GitHub Releases HTTPS artifacts after fixing HTTP-versus-HTTPS client selection in firmware
BMAD path:
  Brief: confirm that firmware still updates correctly through the real production HTTPS release path, not only through a temporary HTTP debug host
  Mapping: inspect production firmware catalog, GitHub releases, device health, and policy-gated OTA endpoint behavior
  Architecture: build a fresh v12 artifact, publish it to GitHub Releases, register it in the production firmware catalog, then trigger OTA through `/devices/SN005/ota`
  Delivery: build v12, create release `firmware-v1.0.1-ota-verification-12`, add catalog record, and run policy-gated OTA to SN005
  Review: confirm OTA job success and post-reboot device health reporting firmware v12
Model usage:
  cheap_steps: 1
  build_steps: 4
  deep_steps: 1
  escalations: 0
Execution:
  files_changed: 2
  verify_commands: OTA_FIRMWARE_VERSION=1.0.1-ota-verification-12 pio run -c platformio.ota.ini; gh release create firmware-v1.0.1-ota-verification-12; curl /admin/firmware/releases; POST /devices/SN005/ota; curl /ota/jobs/<jobId>; curl /devices/SN005/health
  verify_passed: yes
  rework_loops: 0
Handoff:
  handoff_updated: yes
Result:
  outcome: GitHub Releases HTTPS OTA is verified end-to-end and SN005 now reports firmware 1.0.1-ota-verification-12
  notes: release catalog hygiene still matters because firmware policy marks versions unsupported when they are missing from the catalog
```

## 2026-04-27 OTA Failure Hardening

```text
Date: 2026-04-27
Task: Reproduce OTA failure on mid-transfer server drop, capture exact behavior, and harden firmware so hung downloads terminate with a final failed status
BMAD path:
  Brief: verify what the ESP32 does when OTA download is interrupted and close the gap where backend could remain stuck at downloading forever
  Mapping: create a public drop-server that advertises full firmware length but closes after 256 KiB, observe backend state, then inspect serial runtime during the fault
  Architecture: add shorter client timeouts, defer OTA status publish until reconnect, and add an explicit OTA task watchdog to kill hung downloads after 45 seconds
  Delivery: build failure artifacts, run repeated forced-failure jobs, flash hardened firmware v16 by USB, and rerun the drop test under serial observation
  Review: confirm final backend job status is failed, device remains on old firmware, and telemetry continues after watchdog timeout
Model usage:
  cheap_steps: 2
  build_steps: 7
  deep_steps: 1
  escalations: 1
Execution:
  files_changed: 5
  verify_commands: OTA_FIRMWARE_VERSION=1.0.1-ota-failure-test-13 pio run -c platformio.ota.ini; curl -I/drop-test via temporary Docker host :8081; POST /ota/jobs with forced partial transfer; serial capture during fault; OTA_FIRMWARE_VERSION=1.0.1-ota-hardening-16 pio run -c platformio.ota.ini -t upload --upload-port /dev/cu.SLAB_USBtoUART; curl /ota/jobs/<jobId>; curl /devices/SN005/health
  verify_passed: yes
  rework_loops: 2
Handoff:
  handoff_updated: yes
Result:
  outcome: mid-transfer server drop no longer leaves OTA stuck forever; firmware now marks the job failed after a 45-second watchdog timeout and keeps the previous firmware running
  notes: true Wi-Fi-loss with MQTT disconnect was not physically reproduced yet, but deferred OTA status publish is now in place for that path
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

## 2026-04-26 Orchestration Policy Session

```text
Date: 2026-04-26
Task: Clarify how OpenCode delegation works in this repo and encode that policy in AGENTS.md
BMAD path:
  Brief: explain where orchestration policy belongs and what runtime limits still apply
  Mapping: inspect AGENTS.md and BMAD docs for current workflow gaps around delegation visibility and subagent contracts
  Architecture: keep runtime assumptions explicit and add policy sections for delegation, contracts, visibility, and limits
  Delivery: update AGENTS.md and BMAD docs to make main-agent versus subagent responsibilities clear
  Review: verify the policy text is consistent with the current runtime and does not claim unsupported hard routing
Model usage:
  cheap_steps: 2
  build_steps: 1
  deep_steps: 1
  escalations: 0
Execution:
  files_changed: 3
  verify_commands: none; docs-only policy update
  verify_passed: yes
  rework_loops: 0
Handoff:
  handoff_updated: no
Result:
  outcome: the repo now documents how the main agent should delegate to explore and general, what each subagent contract should contain, and what the runtime still does not guarantee
  notes: this improves orchestration clarity but does not itself create automatic model routing
```

## 2026-04-27 Deploy Workflow Memory

```text
Date: 2026-04-27
Task: Reduce future VPS deploy friction by documenting stable Docker invariants, intentional local↔VPS differences, and exact promotion order
BMAD path:
  Brief: local Docker should be proving ground; VPS deploy should become mechanical instead of rediscovery
  Mapping: inspect docker-compose local/prod files, local test docs, VPS deploy docs, and current handoff state
  Architecture: keep one service shape across local and VPS, allow only explicit documented deltas, store deploy memory in repo docs
  Delivery: add deploy memory doc, link it from workflow docs, and update handoff pointers
  Review: verify both compose files still render and docs point to one deploy memory source
Model usage:
  cheap_steps: 2
  build_steps: 2
  deep_steps: 0
  escalations: 0
Execution:
  files_changed: 4
  verify_commands: docker compose -f docker-compose.local.yml config --services; docker compose -f docker-compose.prod.yml config --services
  verify_passed: yes
  rework_loops: 1
Handoff:
  handoff_updated: yes
Result:
  outcome: future "deploy to VPS" work now has repo memory for what must match, what may differ, and what to verify
  notes: this should cut repeated reasoning time before each deploy and make local-first promotion more consistent
```
