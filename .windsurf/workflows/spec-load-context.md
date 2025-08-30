---
description: Load spec and steering context and set active spec memory
---

# /spec-load-context

Load steering and spec context into the current session and set the active spec in memory for downstream workflows (requirements/design/tasks/implementation).

- Specs root: `.spec-workflow/specs/<spec-name>/`
- Steering root: `.spec-workflow/steering/`
- Templates root: `.windsurf/templates/`
- MCP server: spec-workflow

## Prerequisites
- The target spec directory exists under `.spec-workflow/specs/`.

## Inputs
- specName (kebab-case, required)
- includeTemplates (optional, default: true) — also load spec templates

## Steps
1. Verify spec exists
   - Use `mcp2_spec-list` and check that `specName` is listed.
   - If not found, stop with guidance to create a spec first (e.g., run `/spec-create-requirements`).

2. Load steering context
   - Call `mcp2_get-steering-context` with `projectPath` at the repo root to load:
     - `.spec-workflow/steering/product.md`
     - `.spec-workflow/steering/tech.md`
     - `.spec-workflow/steering/structure.md`

3. Load spec context
   - Call `mcp2_get-spec-context` with `projectPath` and `specName` to load, if present:
     - `requirements.md`
     - `design.md`
     - `tasks.md`

4. Optionally load templates
   - If `includeTemplates` is true: call `mcp2_get-template-context` with `category=spec` and `projectPath` to load:
     - `requirements-template.md`
     - `design-template.md`
     - `tasks-template.md`

5. Set Active Spec memory
   - Persist the active spec for this session using the memory system:
     - Title: `active-spec`
     - Content: `specName=<name>; path=.spec-workflow/specs/<name>/`
     - Tags: `spec_workflow, active_spec`
     - Corpus: this repository workspace

6. Output & next steps
   - Confirm loaded contexts and active spec.
   - Proceed with:
     - `/spec-create-requirements` → if requirements not present/approved
     - `/spec-create-design` → if design not present/approved
     - `/spec-create-tasks` → to author tasks
     - `/spec-implement-tasks` → to execute tasks

## Example Invocation
- `/spec-load-context specName=site-and-page-seo-and-geo-optimization`
- `/spec-load-context specName=user-authentication includeTemplates=false`

## Notes & Guardrails
- This workflow does not modify spec files; it only loads context and sets memory.
- Always keep changes atomic in downstream workflows. Align work with `requirements.md` and `design.md`.
