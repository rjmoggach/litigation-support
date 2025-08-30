---
description: Create and approve a spec's tasks.md using the spec-workflow MCP server, aligned with templates, validators, and steering.
author: Cascade
version: 1.0.0
tags: ["workflow", "spec", "tasks", "mcp", "approval", "atomic-tasks"]
globs: [".spec-workflow/specs/**", ".spec-workflow/steering/**", ".windsurf/templates/tasks-template.md"]
---

# Spec Tasks Creation & Approval Workflow

Objective: Produce an agent-friendly `tasks.md` that breaks the approved design into atomic, implementable tasks, validate against templates/validators, and obtain approval via MCP.

## 0. Prerequisites

- Approved `requirements.md` and `design.md` exist under `.spec-workflow/specs/{feature-name}/`.
- Steering at `.spec-workflow/steering/` (`product.md`, `tech.md`, `structure.md`).
- Templates in `.windsurf/templates/` (especially `tasks-template.md`).
- Use kebab-case feature names (e.g., `personalized-recommendations`).

## 1. Load Context with MCP

- If continuing from Design in this session, you already have context.
- Otherwise:
  - get-template-context with category `spec` to load spec templates.
  - get-steering-context to load steering docs.
  - get-spec-context for `{feature-name}` to load existing spec docs.

## 2. Analyze Design for Task Surfaces

- Identify components, modules, files, and integration points to turn into atomic tasks.
- Map each design section to 1–n tasks, referencing specific files to create/modify.
- Ensure tasks align with `structure.md` conventions (paths, naming, layering).

## 3. Apply Atomic Task Guidelines

- Respect the `tasks-template.md` constraints:
  - 1–3 related files per task
  - 15–30 minutes per task
  - Single, testable purpose
  - Exact file paths specified
  - Agent-friendly and unambiguous
- Use proper checkbox format and hierarchical numbering.
- Reference requirements: `_Requirements: X.Y, Z.A_`
- Reference leverage points to existing code: `_Leverage: path/to/file.ts_`

## 4. Draft Tasks Using Template Structure

- Use `.windsurf/templates/tasks-template.md` sections:
  - Task Overview, Steering Document Compliance, Atomic Task Requirements,
    Task Format Guidelines, Tasks (checkbox list)
- Ensure completeness: cover all design elements and add testing tasks where needed.

## 5. Create tasks.md via MCP

- Use create-spec-doc with:
  - document: `tasks`
  - projectPath: repo root
  - specName: `{feature-name}`
  - content: tasks plan conforming to the template

Result path: `.spec-workflow/specs/{feature-name}/tasks.md`

## 6. Request Approval (MANDATORY) via MCP

- Use request-approval with:
  - type: `document`
  - category: `spec`
  - categoryName: `{feature-name}`
  - title: `Tasks Phase: {feature-name} - Ready for Review`
  - filePath: `.spec-workflow/specs/{feature-name}/tasks.md`
- Important: ONLY provide `filePath` in the approval request.

## 7. Approval Loop

- Poll with get-approval-status.
- If status = `needs-revision`:
  - Address feedback fully.
  - Re-run create-spec-doc with revised content.
  - Create a NEW request-approval (filePath only).
  - Repeat until `approved`.
- Once approved, immediately call delete-approval to clean up.

## 8. Cross-Check Against Validators (Optional, Strongly Recommended)

- Align with `.claude/agents/spec-task-validator.md` criteria:
  - Template structure, atomicity, agent-friendliness, feasibility, coverage, traceability.

## 9. Next Step: Begin Implementation

- Use the Implementation Execution Protocol:
  - spec-status to view progress
  - manage-tasks action: `next-pending` → get first/next task id
  - manage-tasks action: `set-status` to `in-progress` for that task
  - Implement per task details; then `set-status` to `completed`
  - Repeat sequentially until all tasks complete
