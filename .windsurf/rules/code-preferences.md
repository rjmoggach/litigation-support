---
trigger: always_on
description: Preferred conventions for software development environments, formatting, and tone.
globs: ["*"]
---

# Windsurf Personal Execution Preferences

## Indentation & Formatting

- **Indentation:** Always 4 spaces (no tabs) in **all** languages.
- **Python:** Follows PEP-8 where compatible with this.
- **JavaScript/TypeScript/React:** Format to look like Python (4-space indentation, clear block structure).
- **Blank Lines:** Prefer 2 blank lines between top-level functions, classes, or modules.

## Language-Specific Preferences

### Python
- **Dependency Management:** Use `uv` for all environments and installs.
- **File Structure:** Never use bare `.py` files in root.
  - All logic must live in a named package (`directory/__init__.py`).
- **Object Naming:** Standard PEP-8 conventions (snake_case for variables/functions, PascalCase for classes).
- **Explicitness:** Always define package/module scopes clearly.

### Typescript / JavaScript / React
- **Dependency Management:** Use `npm` and `npx`. No global installs.
- **File Structure:**
  - React components live in `PascalCase` directories.
  - Entry file must match directory name (`PascalCase/index.jsx` or `.tsx`).
  - No flat single-file components unless trivial.
- camelCase for variables/functions, PascalCase for components/classes.
- Match Python where possible (4-space indentation, trailing commas, clean function declarations)
- prefer typescript over javascript
- prefer tailwindcss over styled-components

## Cross-Language

- clean, indented, readable, and block-separated.
- Avoid anonymous or “free-floating” code. Modules must be scoped, imports explicit.
- Avoid unnecessary abbreviations. Prefer clarity over brevity.

## Communication Style

- **Tone:** Direct, concise, and pragmatic.
- **Avoid:** Sycophantic, overly positive, or emotionally charged language.
- **Preferred Partner Dynamic:** Collaborative, technical, focused on execution—not emotional support or validation.
