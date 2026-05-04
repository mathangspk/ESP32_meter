# Review Gate Workflow

Use for non-trivial work, dirty worktrees, or multi-session tasks.

## Order

1. Audit
2. Fix Plan
3. Approval Gate
4. Delivery
5. Test
6. Final Review
7. User Testing
8. Commit and Push

## Rules

- Review before code.
- Implementation agent does not approve its own work.
- Subagents only act on explicit instructions from primary agent.
- Subagents do not self-continue into later phases.
- Primary agent keeps context, sequencing, approvals, and final decisions.
- Keep fixes narrow.
- Commit only after verification.
- Push only after explicit approval.

## Fallback Mapping

- `audit-reviewer` -> `general`
- `fix-planner` -> main agent
- `coder` -> main agent
- `tester` -> main agent for local commands, `general` for read-only runtime verification
- `final-reviewer` -> `general`
- `git-committer` -> `ops-light` or main agent

## Reusable Prompt

```text
Use review gate.
Audit current changes first.
Do not edit before fix scope is clear.
Subagents only act on primary-agent instructions.
After approval: fix, test, final review, then commit/push.
```
