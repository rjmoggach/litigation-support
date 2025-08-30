# Project Structure

## Directory Organization

```
litigation-support/
├── backend/                    # Python FastAPI backend service
│   ├── core/                  # Core application configuration and shared utilities
│   │   ├── config.py         # Pydantic settings and environment configuration
│   │   ├── database.py       # SQLAlchemy database setup and connections
│   │   ├── security.py       # Authentication and authorization utilities
│   │   └── storages/         # Multi-backend storage abstraction layer
│   ├── api/                  # API layer and routing
│   │   └── v1/               # Version 1 API endpoints
│   │       └── endpoints.py  # Main API router aggregation
│   ├── users/                # User management domain module
│   │   ├── models.py         # SQLAlchemy user models
│   │   ├── schemas.py        # Pydantic schemas for API serialization
│   │   ├── api.py            # User API endpoints
│   │   └── services.py       # User business logic
│   ├── images/               # Image processing and management
│   ├── contacts/             # Contact management
│   ├── tags/                 # Document tagging system
│   ├── storage/              # File storage management
│   ├── main.py               # FastAPI application entry point
│   ├── pyproject.toml        # Python project configuration and dependencies
│   └── alembic.ini           # Database migration configuration
├── frontend/                 # Next.js TypeScript frontend application
│   ├── app/                  # Next.js 13+ App Router structure
│   ├── components/           # Reusable React components
│   ├── lib/                  # Shared utilities and configurations
│   ├── public/               # Static assets and images
│   ├── package.json          # Node.js dependencies and scripts
│   └── next.config.ts        # Next.js configuration
├── gmail-harvester/          # Legacy/specialized Gmail processing module
│   └── backend/              # Separate backend for Gmail-specific operations
└── docker-compose.yml        # Development environment orchestration
```

## Naming Conventions

### Files
- **Components/Modules**: `snake_case` for Python modules, `PascalCase` for React components
- **Services/Handlers**: `UserService` pattern in Python, descriptive names like `user_service.py`
- **Utilities/Helpers**: `snake_case` for Python utilities, `camelCase` for TypeScript utilities
- **Tests**: `test_[filename].py` for Python pytest, `[filename].test.ts` for frontend tests

### Code
- **Classes/Types**: `PascalCase` for Python classes and TypeScript interfaces/types
- **Functions/Methods**: `snake_case` for Python functions, `camelCase` for TypeScript functions
- **Constants**: `UPPER_SNAKE_CASE` for Python constants, `UPPER_SNAKE_CASE` for TypeScript constants
- **Variables**: `snake_case` for Python variables, `camelCase` for TypeScript variables

## Import Patterns

### Backend Python Import Order
1. Standard library imports
2. Third-party library imports (FastAPI, SQLAlchemy, etc.)
3. Internal application imports from `core/`
4. Domain module imports (relative within domain)
5. Local relative imports

```python
# Standard library
from typing import List, Optional
import os

# Third-party
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Internal core
from core.database import get_db
from core.security import get_current_user

# Domain modules
from users.models import User
from users.schemas import UserCreate

# Local relative
from .services import create_user
```

### Frontend TypeScript Import Order
1. React and Next.js imports
2. Third-party library imports
3. Internal component imports
4. Utility and configuration imports
5. Type imports (with `type` keyword)
6. Style imports

```typescript
// React/Next.js
import React from 'react'
import { NextPage } from 'next'

// Third-party
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Internal components
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'

// Types
import type { User } from '@/types/user'

// Styles
import styles from './UserForm.module.css'
```

## Code Structure Patterns

### Backend Domain Module Organization
Each domain module follows a consistent structure:

```python
# domain_module/
├── __init__.py           # Module initialization
├── models.py            # SQLAlchemy database models
├── schemas.py           # Pydantic request/response schemas
├── api.py               # FastAPI route handlers
├── services.py          # Business logic and data processing
├── deps.py              # Dependency injection helpers
└── mixins.py            # Reusable model mixins (if applicable)
```

### Frontend Component Organization
```typescript
// Component file structure
1. Imports (following import order above)
2. Type definitions and interfaces
3. Component props interface
4. Main component implementation
5. Sub-components (if small and related)
6. Default export
7. Named exports for utilities
```

### API Endpoint Organization
```python
# API route structure
1. Route decorator and HTTP method
2. Input validation with Pydantic schemas
3. Dependency injection (database, current user, etc.)
4. Business logic delegation to services
5. Error handling with proper HTTP status codes
6. Response serialization with Pydantic schemas
```

## Code Organization Principles

1. **Domain-Driven Design**: Backend organized by business domains (users, images, contacts, tags) rather than technical layers
2. **Separation of Concerns**: Clear separation between API layer, business logic, and data access
3. **Self-Contained Modules**: Each domain module contains all its related functionality (models, schemas, API, services)
4. **Framework Conventions**: Follow FastAPI and Next.js established patterns and conventions
5. **User-Centric Structure**: Organization prioritizes features that directly serve self-represented litigants

## Module Boundaries

### Backend Module Dependencies
- **Core modules** (`core/`): Can be imported by any domain module, contain no domain-specific logic
- **Domain modules**: Should not directly import from other domain modules; use service layer for cross-domain operations
- **API layer**: Orchestrates domain services but contains minimal business logic
- **Services**: Contain business logic and can coordinate between domains through well-defined interfaces

### Frontend Component Boundaries
- **UI Components** (`components/ui/`): Pure, reusable components with no business logic
- **Feature Components** (`components/features/`): Business logic components for specific user workflows
- **Page Components** (`app/`): Route-specific components that coordinate feature components
- **Utilities** (`lib/`): Shared functions with no UI dependencies

### Storage Backend Abstraction
```python
# Storage backends are pluggable and interchangeable
core/storages/
├── base.py              # Abstract base class defining storage interface
├── s3.py                # AWS S3 implementation
├── dropbox.py           # Dropbox API implementation
├── factory.py           # Storage backend factory and configuration
└── __init__.py          # Public API exports
```

## Code Size Guidelines

### Backend Guidelines
- **File size**: Maximum 500 lines per Python module
- **Function/Method size**: Maximum 50 lines per function, prefer 20-30 lines
- **Class complexity**: Maximum 10 methods per class, use composition for larger functionality
- **Nesting depth**: Maximum 4 levels of nesting, extract complex logic into separate functions

### Frontend Guidelines
- **Component size**: Maximum 200 lines per React component file
- **Function size**: Maximum 30 lines per function, prefer 10-20 lines
- **Hook complexity**: Custom hooks should be focused on single concerns
- **File organization**: Split large components into multiple files with clear naming

## User Experience Structure

### Self-Service Navigation Flow
```
1. Authentication (Google OAuth)
2. Case Setup (guided workflow)
3. Evidence Collection (email harvesting, document upload)
4. Organization (tagging, categorization)
5. Review & Export (court-ready packages)
```

### Accessibility-First Component Structure
- Components use semantic HTML and ARIA attributes
- Radix UI components provide accessibility by default
- Color contrast and keyboard navigation considered in all UI elements
- Mobile-responsive design patterns throughout

## Configuration and Environment Management

### Backend Configuration
- **Environment-based**: Development, staging, production configurations
- **Pydantic Settings**: Type-safe configuration with validation
- **Secret Management**: Environment variables for sensitive data, no hardcoded secrets
- **Multi-Storage Config**: Runtime selection of storage backends based on user preferences

### Frontend Configuration
- **Next.js Environment**: Client-side and server-side environment variable handling
- **Build-time Configuration**: Feature flags and API endpoint configuration
- **Runtime Configuration**: User preferences and dynamic feature toggles

## Documentation Standards

### Backend Documentation
- **API Documentation**: Automatic OpenAPI/Swagger generation through FastAPI
- **Function Documentation**: Docstrings for all public functions following Python conventions
- **Domain Documentation**: README files explaining business logic in each domain module
- **Configuration Documentation**: Clear documentation of all environment variables and settings

### Frontend Documentation
- **Component Documentation**: JSDoc comments for complex components
- **Type Documentation**: Comprehensive TypeScript types serving as documentation
- **User Flow Documentation**: Clear documentation of user journeys and workflows
- **Accessibility Documentation**: Notes on accessibility considerations and testing

### User-Focused Documentation
- **Self-Service Guides**: Step-by-step instructions for common legal tasks
- **Privacy Documentation**: Clear explanations of data handling and storage options
- **Troubleshooting Guides**: Common issues and solutions for non-technical users
- **Legal Context**: Explanations of why certain features exist and how they help with legal proceedings
