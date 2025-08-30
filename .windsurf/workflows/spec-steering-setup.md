---
description: Create or migrate steering documents (product/tech/structure) to the canonical .spec-workflow/steering/ directory for consistent spec workflows.
author: Cascade
version: 1.1.0
tags: ["workflow", "steering", "spec", "context"]
globs: [".spec-workflow/steering/**", ".claude/steering/**"]
auto_execution_mode: 1
---

# /spec-steering-setup

Create or update steering documents that provide persistent project context.


## Instructions
You are helping set up steering documents that will guide all future spec development. These documents provide persistent context about the product vision, technology stack, and project structure.

## Process

1. **Check for Existing Steering Documents**
   - Look for `.spec-workflow/steering/` directory (canonical)
   - Check for existing product.md, tech.md, structure.md files
   - If they exist, load and display current content
   - If only `.claude/steering/` exists, migrate or mirror its contents to `.spec-workflow/steering/` to align with repository workflows
   - If both exist, treat `.spec-workflow/steering/` as source of truth and reconcile differences (prefer newer timestamps; preserve intent)

2. **Analyze the Project**
   - Review the codebase to understand:
     - Project type and purpose
     - Technology stack in use
     - Directory structure and patterns
     - Coding conventions
     - Existing features and functionality
   - Look for:
     - package.json, pyproject.toml, uv.lock, requirements.txt, go.mod, etc.
     - README files
     - Configuration files
     - Source code structure

3. **Present Inferred Details**
   - Show the user what you've learned about:
     - **Product**: Purpose, features, target users
     - **Technology**: Frameworks, libraries, tools
     - **Structure**: File organization, naming conventions
   - Format as:
     ```
     Based on my analysis, here's what I've inferred:
     
     **Product Details:**
     - [Inferred detail 1]
     - [Inferred detail 2]
     
     **Technology Stack:**
     - [Inferred tech 1]
     - [Inferred tech 2]
     
     **Project Structure:**
     - [Inferred pattern 1]
     - [Inferred pattern 2]
     ```
   - Ask: "Do these inferred details look correct? Please let me know which ones to keep or discard."

4. **Gather Missing Information**
   - Based on user feedback, identify gaps
   - Ask targeted questions to fill in missing details:
     
     **Product Questions:**
     - What is the main problem this product solves?
     - Who are the primary users?
     - What are the key business objectives?
     - What metrics define success?
     
     **Technology Questions:**
     - Are there any technical constraints or requirements?
     - What third-party services are integrated?
     - What are the performance requirements?
     
     **Structure Questions:**
     - Are there specific coding standards to follow?
     - How should new features be organized?
     - What are the testing requirements?

5. **Generate Steering Documents**
   - Create `.spec-workflow/steering/` directory if it doesn't exist (canonical)
   - If migrating, copy or mirror existing `.claude/steering/` contents into `.spec-workflow/steering/`
   - Generate three files based on gathered information:
    
    **product.md** — Product vision and outcomes
      - Vision and scope
      - Target users and personas
      - Core use cases and features
      - Non-goals/out-of-scope
      - Success metrics
    
    **tech.md** — Stack and constraints
      - Runtime/frameworks, languages
      - Data/storage, integrations/services
      - DevEx/tooling, CI/CD
      - Constraints and key decisions (with rationale)
      - Performance/security/accessibility considerations
    
    **structure.md** — Organization and conventions
      - Repo topology and module boundaries/layers
      - Naming conventions (files, dirs, symbols)
      - Preferred patterns and anti-patterns
      - Testing strategy and placement
      - Documentation locations

6. **Review and Confirm**
   - Present the generated documents to the user
   - Ask for final approval before saving
   - Make any requested adjustments

## Important Notes

- **Steering documents are persistent** - they will be referenced in all future spec commands
- **Keep documents focused** - each should cover its specific domain
- **Update regularly** - steering docs should evolve with the project
- **Never include sensitive data** - no passwords, API keys, or credentials
 - **Canonical path** - `.spec-workflow/steering/` is the source of truth. `.claude/steering/` may exist for legacy/reference; prefer mirroring to the canonical path.

## Example Flow

1. Analyze project and find it's a React/TypeScript app
2. Present inferred details about the e-commerce platform
3. User confirms most details but clarifies target market
4. Ask about performance requirements and third-party services
5. Generate steering documents with all gathered information
6. User reviews and approves the documents
7. Save to `.spec-workflow/steering/` directory

## Example Invocation

- `/spec-steering-setup`

## Next Steps
After steering documents are created, they will automatically be referenced during:
- `/spec-load-context` - Load steering/spec context for the session
- `/spec-create-requirements` - Align requirements with product vision
- `/spec-create-design` - Follow established tech patterns
- `/spec-create-tasks` - Use correct file organization
- `/spec-implement-tasks` - Implement following all conventions
