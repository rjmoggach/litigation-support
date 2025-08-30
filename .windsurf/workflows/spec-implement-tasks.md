---
description: Execute spec tasks with MCP manage-tasks in a repeatable, atomic, approval-aligned flow
---

# /spec-implement-tasks

Execute implementation tasks defined in `tasks.md` for a spec using the spec-workflow MCP server. Enforces atomic changes, clear status transitions, and validation before completion.

- Source of truth for specs: `.spec-workflow/specs/<spec-name>/`
- Steering context: `.spec-workflow/steering/`
- MCP server: spec-workflow

## Prerequisites
- requirements.md and design.md are approved for the target spec.
- tasks.md exists with pending tasks.

## Inputs
- specName (kebab-case, required)
- taskId (optional; if omitted, the next pending task will be selected)

## Steps
1. Verify spec phase status
   - Use `mcp2_spec-status` to ensure Requirements and Design phases are complete for `specName`.
   - If not complete, run `/spec-create-requirements` and `/spec-create-design` first.

2. Load task context
   - If `taskId` is provided: `mcp2_manage-tasks context` for `specName` + `taskId`.
   - Else: `mcp2_manage-tasks next-pending` to retrieve the next pending taskId.
   - If no pending tasks, stop with a success message (nothing to implement).

3. Mark task In-Progress
   - `mcp2_manage-tasks set-status` → `in-progress` for the selected `taskId`.

4. Implement the task (atomic change)
   - Scope edits strictly to files referenced by the task description and its file scope.
   - Align with `requirements.md` and `design.md` under `.spec-workflow/specs/<specName>/`.
   - Follow Baby Steps: smallest meaningful change; validate before moving on.
   - Prefer existing modules and open-source packages over custom code when possible.

5. Validate the changes
   - Frontend (if applicable): run repository scripts for typecheck/lint/tests.
   - Backend (if applicable): run repository scripts/tests (use `uv` where configured).
   - Ensure no deprecated APIs; address warnings where feasible.

6. Mark task Completed
   - `mcp2_manage-tasks set-status` → `completed` for `taskId` once validation passes.

7. Optional: iterate to next task
   - Call `mcp2_manage-tasks next-pending` and repeat from Step 3.

## Notes & Guardrails
- Atomicity is mandatory; avoid multi-feature changes.
- Document meaningful features under `/docs/` when part of the task acceptance criteria.
- If blocked, capture a concise note or create a follow-up task instead of partial commits.

## Example Invocation
- `/spec-implement-tasks specName=user-authentication`
- `/spec-implement-tasks specName=site-and-page-seo-and-geo-optimization taskId=27`
