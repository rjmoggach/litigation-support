---
description: Create and approve a spec's design.md using the spec-workflow MCP server, aligning with repository steering and templates.
author: Cascade
version: 1.0.0
tags: ["workflow", "spec", "design", "mcp", "approval"]
globs: [".spec-workflow/specs/**", ".spec-workflow/steering/**", ".windsurf/templates/design-template.md"]
---

# Spec Design Creation & Approval Workflow

Objective: Create a comprehensive `design.md` based on approved requirements, validate it against templates, validators, and steering, and obtain approval via the MCP approval system.

## 0. Prerequisites

- Approved `requirements.md` exists under `.spec-workflow/specs/{feature-name}/`.
- Steering present at `.spec-workflow/steering/` (`product.md`, `tech.md`, `structure.md`).
- Templates in `.windsurf/templates/` (especially `design-template.md`).
- Use kebab-case feature names (e.g., `personalized-recommendations`).

## 1. Load Context with MCP

- If continuing from Requirements in the same session, you already have context.
- Otherwise:
  - get-template-context with category `spec` to load spec templates.
  - get-steering-context to load steering docs (if present).
  - get-spec-context for `{feature-name}` to load existing spec docs.

## 2. Analyze Existing Codebase for Reuse

- Identify components/services/hooks/modules to leverage.
- Document integration points with current systems and data models.
- Follow project structure and naming from `structure.md`.

Hints:
- Search for related domain code.
- Prefer extension over reinvention; note leverage locations.

## 3. Technology and Pattern Research (recommended)

- Verify current best practices, package versions, and compatibility.
- Consider performance, security, and maintenance implications.

## 4. Draft Design Using Template Structure

- Use `.windsurf/templates/design-template.md` as the structure and include all sections:
  - Overview, Steering Alignment (tech.md, structure.md)
  - Code Reuse Analysis (Existing components/utilities to leverage)
  - Architecture (include Mermaid diagram)
  - Components and Interfaces (purpose, interfaces, dependencies, reuses)
  - Data Models (schemas/structures)
  - Error Handling (scenarios, handling, user impact)
  - Testing Strategy (unit, integration, e2e)
- Trace to requirements where relevant to ensure coverage.

## 5. Create design.md via MCP

- Use create-spec-doc with:
  - document: `design`
  - projectPath: repo root
  - specName: `{feature-name}`
  - content: design conforming to the template

Result path: `.spec-workflow/specs/{feature-name}/design.md`

## 6. Request Approval (MANDATORY) via MCP

- Use request-approval with:
  - type: `document`
  - category: `spec`
  - categoryName: `{feature-name}`
  - title: `Design Phase: {feature-name} - Ready for Review`
  - filePath: `.spec-workflow/specs/{feature-name}/design.md`
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

- Align with `.claude/agents/spec-design-validator.md` criteria:
  - Template compliance, architecture quality, standards compliance, integration leverage, completeness, documentation quality, feasibility.

## 9. Persist Awareness (Optional)

- Store a memory note for active spec name/path for continuity.

## 10. Next Step

- Proceed to the Tasks phase workflow for `{feature-name}` once design is approved.
