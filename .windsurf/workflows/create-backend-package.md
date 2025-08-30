---
description: Defines the step-by-step workflow for creating a new backend feature package, ensuring it adheres to the established modular architecture.
---

# Backend Package Creation Workflow

**Objective:** To provide a consistent, repeatable process for creating new feature packages in the FastAPI backend. This workflow ensures that all new packages adhere to the project's established modular architecture, using the `users` package as the primary reference.

**Core Principle:** Each feature package should be self-contained, with its own models, schemas, services, and API endpoints. The top-level API router (`app/api/v1/endpoints.py`) should remain a thin wrapper that simply includes the routers from these feature packages.

---

## Prerequisite

Before starting, familiarize yourself with the structure and implementation of the `backend/app/users/` package. It serves as the blueprint for all new packages.

## Step-by-Step Workflow

1.  **Create Package Directory:**
    *   Create a new directory for your feature inside `backend/app/`.
    ```bash
    mkdir backend/app/<package_name>
    ```

2.  **Create Core Package Files:**
    *   Populate the new directory with the standard set of files. You can `touch` them initially.
    ```bash
    touch backend/app/<package_name>/__init__.py
    touch backend/app/<package_name>/api.py
    touch backend/app/<package_name>/crud.py
    touch backend/app/<package_name>/deps.py
    touch backend/app/<package_name>/models.py
    touch backend/app/<package_name>/schemas.py
    touch backend/app/<package_name>/services.py
    ```

3.  **Define SQLAlchemy Model (`models.py`):**
    *   In `<package_name>/models.py`, define your SQLAlchemy table class.
    *   It **MUST** inherit from `app.core.db.Base` to be included in metadata operations.

4.  **Define Pydantic Schemas (`schemas.py`):**
    *   In `<package_name>/schemas.py`, define the Pydantic models for data validation and serialization.
    *   Typically, you will create `SchemaBase`, `SchemaCreate`, `SchemaUpdate`, and a main `Schema` model for reads.

5.  **Implement CRUD Operations (`crud.py`):**
    *   In `<package_name>/crud.py`, implement the core database operations (Create, Read, Update, Delete) for your new model. These functions will take a `db: Session` and Pydantic schemas as arguments.

6.  **Implement CRUD Operations (`deps.py`):**
    *   In `<package_name>/deps.py`, implement the package specific FastAPI dependencies if any exists.

7.  **Implement Business Logic (`services.py`):**
    *   In `<package_name>/services.py`, create service functions or classes that orchestrate the business logic. These services will call the CRUD functions.

8.  **Create API Endpoints (`api.py`):**
    *   In `<package_name>/api.py`, create an `APIRouter` instance.
    *   Define the API path operations (`@router.post`, `@router.get`, etc.) that will be exposed.
    *   These endpoints should call your service functions to execute the business logic.

9.  **Register the New Model (`main.py`):**
    *   In `backend/app/main.py`, import your new models.
    *   Ensure the new tables are created on startup by adding the corresponding `create_all` call.
    ```python
    // backend/app/main.py
    from app.<package_name> import models as <package_name>_models

    // Add this line near the existing user_models call
    <package_name>_models.Base.metadata.create_all(bind=engine)
    ```

10.  **Include the New Router (`endpoints.py`):**
    *   In `backend/app/api/v1/endpoints.py`, import the router from your package's `api.py` file.
    *   Include it in the main `v1_router` with an appropriate tag.
    ```python
    // backend/app/api/v1/endpoints.py
    from app.<package_name> import api as <package_name>_api

    router.include_router(<package_name>_api.router, tags=["<package_name>"])
    ```

11. **Create Tests:**
    *   Create a `tests/` directory within your package: `mkdir backend/app/<package_name>/tests`.
    *   Add an empty `__init__.py` file.
    *   Write unit and integration tests for your new services, CRUD operations, and API endpoints, following the patterns in the `users` package.

---

By following this workflow, you ensure that every new piece of backend functionality is added in a consistent, modular, and maintainable way.
