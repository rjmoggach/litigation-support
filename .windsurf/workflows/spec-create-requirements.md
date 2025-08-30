---
description: Create and approve a spec's requirements.md using the spec-workflow MCP server and repository templates/steering.
---

# Spec Requirements Creation & Approval Workflow

Objective: Create a complete `requirements.md` for a new feature spec, validate it against templates and steering, and obtain approval via the MCP approval system.

## 0. Prerequisites

- Ensure the project follows the spec-driven structure:
  - Steering at `.spec-workflow/steering/` (`product.md`, `tech.md`, `structure.md`)
  - Specs at `.spec-workflow/specs/`
  - Templates at `.windsurf/templates/` (e.g., `requirements-template.md`)
- Use kebab-case feature names (e.g., `user-authentication`).
- Read `.windsurf/rules/workflow-rules.md` for conventions.

## 1. Name the Feature (kebab-case)

- Decide a short, descriptive feature name. Example: `personalized-recommendations`.
- This will become the spec folder name under `.spec-workflow/specs/{feature-name}`.

## 2. Load Context with MCP

- Use MCP tools to load necessary context once per run:
  - get-template-context with category `spec` to load spec templates.
  - get-steering-context to load `.spec-workflow/steering/` if present.
- Note relevant constraints/standards from steering (`product.md`, `tech.md`, `structure.md`).

## 3. Analyze Existing Codebase for Reuse

- Scan for patterns/components/services/hooks to leverage.
- Identify integration points and existing naming/architecture conventions.
- Prefer reuse over creating new primitives.

Hints (use tools as needed):
- List/search directories relevant to the feature.
- Grep for domain terms and existing service boundaries.

## 4. Market/UX/Constraints Research (optional but recommended)

- If needed, research current best practices and constraints for the feature area to inform requirements.
- Capture any regulatory, accessibility, or platform constraints.

## 5. Draft Requirements Using Template Structure

- Use the requirements template from `.windsurf/templates/requirements-template.md` as the structure.
- Include:
  - Intro/Scope
  - User stories ("As a [role], I want [feature], so that [benefit]")
  - Acceptance criteria in EARS format:
    - WHEN [event] THEN [system] SHALL [response]
    - IF [precondition] THEN [system] SHALL [response]
  - Edge cases, non-functional requirements (performance, security), success metrics.
- Reference steering doc constraints when relevant.

## 6. Create requirements.md via MCP

- Use create-spec-doc with:
  - document: `requirements`
  - projectPath: repo root
  - specName: `{feature-name}` (kebab-case)
  - content: the requirements conforming to the template

Result path: `.spec-workflow/specs/{feature-name}/requirements.md`

## 7. Request Approval (MANDATORY) via MCP

- Use request-approval with:
  - type: `document`
  - category: `spec`
  - categoryName: `{feature-name}`
  - title: `Requirements Phase: {feature-name} - Ready for Review`
  - filePath: `.spec-workflow/specs/{feature-name}/requirements.md`
- Important: ONLY provide `filePath` in the approval request.

## 8. Approval Loop

- Wait for user to review in dashboard or headless mode.
- Poll with get-approval-status.
- If status = `needs-revision`:
  - Address feedback fully.
  - Re-run create-spec-doc with revised content.
  - Create a NEW request-approval (filePath only).
  - Repeat until status = `approved`.
- Once approved, immediately call delete-approval to clean up.

## 9. Cross-Check Against Validators (Optional, Strongly Recommended)

- Review `.claude/agents/spec-requirements-validator.md` for quality checks.
- Confirm all template sections are present and acceptance criteria cover edge cases.

## 10. Persist Awareness (Optional)

- Store a memory note for the active spec name/path so Cascade can reference it easily in subsequent phases.

## 11. Next Step

- Proceed to the Design phase workflow for `{feature-name}` once requirements are approved.
