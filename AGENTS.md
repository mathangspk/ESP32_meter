# AGENTS.md

## Start Here

Read first:

1. `PROJECT_CONTEXT.md`
2. `docs/handoff.md`

These are source of truth for hardware, current runtime state, verified results, and next step.

## Default Workflow

Use this order unless user says otherwise:

1. Inspect relevant code and repo state.
2. Run review-gate for non-trivial work.
3. Use lightweight BMAD flow.
4. Make smallest correct change.
5. Verify.
6. Commit verified milestone.
7. Push milestone.
8. Update `docs/handoff.md`.

## Review Gate

Default for non-trivial work, dirty worktrees, or multi-session tasks:

1. Audit
2. Fix Plan
3. Approval Gate
4. Delivery
5. Test
6. Final Review
7. User Testing
8. Commit and Push

Rules:

- Review before code.
- Implementation agent must not approve its own work.
- Do not edit until scope is understood and, when needed, approved.
- Keep fixes narrow. No unrelated refactors.
- Do not move to user testing until findings are addressed, checks pass, and final review says ready.
- Trivial fully local tasks may collapse Audit, Fix Plan, and Delivery into one pass if review quality stays high.

Required outcomes:

- Audit: no unresolved critical issue before Delivery.
- Test: relevant build/test/runtime checks pass before Final Review.
- Final Review: explicit ready or not ready for user testing.

## BMAD Flow

Use this lightweight flow:

1. Brief
2. Mapping
3. Architecture
4. Delivery
5. Review

Phase intent:

- Brief: goal, acceptance criteria, out of scope.
- Mapping: relevant files, runtime state, logs, likely failure points.
- Architecture: smallest correct approach, verification order.
- Delivery: make change, verify, keep scope narrow.
- Review: regressions, operational risk, missing verification.

Do not skip straight to Delivery for non-trivial work unless scope is already obvious from current repo state.

## Delegation Policy

- Primary agent owns planning, sequencing, approvals, implementation decisions, verification decisions, commit/push steps, and handoff updates.
- Subagents only act on explicit instructions from primary agent.
- Subagents do not self-initiate, expand scope, or continue into follow-up phases unless primary agent explicitly asks.
- Subagents must return control to primary agent after finishing assigned contract.
- Primary agent remains source of truth for overall context and final decisions.
- Main agent may skip delegation only when scope is fully known and work is trivially local.

Preferred use:

- `explore`: repo mapping, cross-file discovery, endpoint tracing, schema tracing, first-pass VPS inspection.
- `general`: read-only review, research, tradeoff analysis, broader reasoning, fallback runtime verification.
- `audit-reviewer`: strict read-only audit before further edits.
- `fix-planner`: turn findings into minimal fix sequence.
- `coder`: implement approved fixes only.
- `tester`: build/test execution without edits.
- `final-reviewer`: read-only final review after Delivery and Test.
- `git-committer` or `ops-light`: git-only work after approval.
- `vps-verify`: read-only post-deploy production verification.

Fallback mapping when runtime does not expose custom review-gate subagents:

- `audit-reviewer` -> `general`
- `fix-planner` -> main agent
- `coder` -> main agent
- `tester` -> main agent for local commands, `general` for read-only runtime verification
- `final-reviewer` -> `general`
- `git-committer` -> `ops-light` or main agent

Use `explore` before non-trivial firmware+backend+bot work if path is not already fully known.

## Subagent Contract

Every delegation prompt must include:

- exact task goal
- scope limits
- whether work is read-only or may edit
- exact output format expected back
- verification expectations if applicable

Expected outputs by role:

- `explore`: relevant files, key flows, likely risk points, open questions
- `general`: findings or conclusions, severity/confidence, next action, testing gaps
- `audit-reviewer`: summary, critical issues, important issues, minor issues, manual checks, ready/not ready
- `fix-planner`: must fix, should fix, can defer, implementation order
- `coder`: files changed, what fixed, what not fixed, risks, suggested tests
- `tester`: commands executed, pass/fail, failure summary, likely root cause, safe for user testing or not
- `final-reviewer`: ready yes/no, remaining risks, manual test checklist
- `git-committer` / `ops-light`: git status/diff summary, commit result, push result if requested, blockers
- `vps-verify`: container/runtime summary, health results, broker/device evidence, blockers, next safe action

## Visibility Rules

- Before calling a subagent, primary agent should send short commentary naming subagent, why it is used, and expected output.
- After a subagent returns, primary agent should summarize result and how it affects next step.
- Keep delegation commentary short and operational.

## Runtime Limits

- `AGENTS.md` defines repository policy and delegation guidance. It does not itself spawn or route agents.
- Available subagent types come from OpenCode runtime, not this repo.
- Primary agent must explicitly invoke subagents through runtime tools.
- When exact model routing is not enforceable, treat repo routing as governance intent, not hard guarantee.

## Model Routing Policy

Default to cheaper models first, escalate only when needed.

- `gpt mini`: short rewrites, checklists, summaries, handoff text.
- `Minimax M2.5 free`: mapping, docs, code-flow summaries, first-pass bug hypotheses.
- `gpt-5.3 codex`: code changes, endpoint work, tight fix loops.
- `gpt-5.4`: hard debugging, firmware+backend interactions, cross-file reasoning, final risk review.
- `gpt-5.5`: major architecture changes and broad redesign.

Repository defaults:

- Firmware MQTT and OTA: map with `Minimax M2.5 free`, implement with `gpt-5.3 codex`, review with `gpt-5.4`.
- Backend and bot feature work: map with `Minimax M2.5 free`, implement with `gpt-5.3 codex`, review with `gpt-5.4` only when change crosses multiple areas or affects runtime safety.
- Docs and handoff work: prefer `gpt mini` or `Minimax M2.5 free`.

Escalate to `gpt-5.4` when task involves firmware+backend together, timing/reconnect/OTA/network state, multiple plausible root causes, failed first pass, or stronger risk review is needed.

Escalate to `gpt-5.5` only for system-boundary or deployment-shape changes.

## Verification Rules

Do not treat change as complete until relevant checks pass.

- Firmware changes: run `pio run`
- Device upload work: `pio run -t upload --upload-port /dev/cu.SLAB_USBtoUART`
- Runtime checks: inspect serial with `pio device monitor -p /dev/cu.SLAB_USBtoUART -b 115200` or equivalent direct serial read
- Network changes: verify expected Wi-Fi, MQTT, or HTTP behavior from logs or remote endpoint
- VPS deploys: verify compose/container state, `curl http://127.0.0.1:3000/healthz`, and relevant device/API evidence

## Commit And Push Policy

- Commit only after milestone is verified.
- Keep commits scoped to one technical outcome.
- Push after each successful milestone.
- Do not force-push.
- Do not rewrite history unless user explicitly asks.

Example commit themes:

- `debug: confirm live PZEM readings`
- `fix: restore MQTT connectivity`
- `fix: restore NTP sync`
- `chore: reduce runtime log noise`

## Current Debug Order

Follow unless user reprioritizes:

1. Confirm PZEM readings under real load.
2. Restore MQTT connectivity and confirm publish success.
3. Restore NTP synchronization.
4. Reduce debug logging for normal operation.
5. Run longer stability check.

## Operational Facts

- Board: `esp32doit-devkit-v1`
- Serial monitor speed: `115200`
- Current upload port on this machine: `/dev/cu.SLAB_USBtoUART`
- PZEM UART pins in code: `GPIO16` and `GPIO17`

## Handoff Rule

After each verified milestone, update `docs/handoff.md` with:

- what was confirmed
- what changed
- remaining issues
- exact next step
- most relevant command or log evidence
- current BMAD phase
- recommended model lane
- escalation trigger if next step gets stuck
