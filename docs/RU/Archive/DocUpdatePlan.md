> **[DISCLAIMER]** This document outlines visionary concepts, research notes, or future plans. It does **not** describe the current, implemented architecture of the project. For an accurate description of the current system, please refer to `docs/architecture/SYSTEM_DESCRIPTION.MD`.
# Documentation Update Plan: MongoDB to PostgreSQL Migration

This document outlines the documentation files that require updates following the migration from MongoDB to PostgreSQL, and the key changes needed for each.

1.  **`README.md` (Root)**
    *   **Database Change:** Replace all mentions of MongoDB with PostgreSQL as the primary database.
    *   **Setup Instructions:** Update local development setup instructions to reflect PostgreSQL setup (installation, creating a database/user) instead of MongoDB.
    *   **Environment Variables:** Refer to `.env.example` for the new `POSTGRES_*` variables; remove references to `MONGO_URI`, `MONGO_DB_NAME`.
    *   **Dependencies:** If database clients are mentioned, update to `asyncpg` and `psycopg2-binary`, removing `motor` and `pymongo`.

2.  **`ARCHITECTURE.md`**
    *   **Diagrams:** Update any system architecture diagrams to show PostgreSQL instead of MongoDB.
    *   **Data Storage Section:** Revise text describing the data persistence layer to detail the use of PostgreSQL and its relevant features (e.g., relational structure, JSONB, pgvector for embeddings).
    *   **Technology Stack:** Ensure PostgreSQL is listed as a core technology.

3.  **`PROJECT_CONTEXT.md`**
    *   **Technology Stack:** Update the backend technology stack to list PostgreSQL instead of MongoDB.
    *   **Data Handling:** Review sections discussing data models or data flow to ensure they align with a relational PostgreSQL database, rather than a NoSQL MongoDB approach.

4.  **`backend/README.md`**
    *   **Database Setup:** Provide specific instructions for setting up a PostgreSQL database and user for the backend.
    *   **Connection Details:** Update any examples of database connection strings or configurations.
    *   **Environment Variables:** List and describe the `POSTGRES_*` environment variables required for the backend.
    *   **Dependencies:** Explicitly list `asyncpg` and `psycopg2-binary` as new dependencies. List `motor` and `pymongo` as removed.
    *   **Local Development:** Revamp the local development guide to include PostgreSQL installation, database creation, and running the application with the new database.

5.  **`.env.example`**
    *   *This file was already updated in a previous task.*
    *   Ensure it accurately reflects PostgreSQL variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_PORT`, `POSTGRES_POOL_MIN_SIZE`, `POSTGRES_POOL_MAX_SIZE`) and that MongoDB variables are removed.

6.  **`Dockerfile`**
    *   **System Dependencies:** If MongoDB client libraries (e.g., `mongo-tools`) were installed via `apt-get` or similar, remove those lines. Add installation of `libpq-dev` or other PostgreSQL client libraries if required for `psycopg2-binary` (though `psycopg2-binary` often bundles these, it's good to check build logs).
    *   **Environment Variables:** Ensure any build-time or runtime environment variables related to database connection are updated or parameterized correctly for PostgreSQL.
    *   **Health Checks:** If the Dockerfile includes a health check that tests MongoDB, update it to test PostgreSQL.

7.  **`.github/workflows/ci.yml` (and other workflow files)**
    *   **Service Containers:** If CI jobs use a service container for MongoDB, replace it with a PostgreSQL service container (e.g., `services: postgres: image: postgres:latest ...`).
    *   **Environment Variables:** Update environment variables set in the CI workflow for database connections (`POSTGRES_USER`, `POSTGRES_DB`, etc.).
    *   **Setup Steps:** Modify any steps that installed MongoDB-specific dependencies or tools for testing.
    *   **Test Execution:** Ensure tests run against a PostgreSQL instance.

8.  **`docs/SYSTEM_INSTRUCTION_CURRENT.md`**
    *   **Database References:** Search for "MongoDB" and replace with "PostgreSQL".
    *   **Setup Instructions:** If this document contains instructions for system setup or deployment, update any database-related steps.
    *   **Configuration:** Update any configuration examples or explanations that refer to MongoDB connection strings or settings.

**General Approach for all files:**
*   Search for keywords: "MongoDB", "Mongo", "pymongo", "motor", "document database", "NoSQL" (where context implies MongoDB).
*   Replace with PostgreSQL equivalents: "PostgreSQL", "Postgres", "asyncpg", "psycopg2-binary", "relational database", "SQL".
*   Verify that instructions for installing dependencies, configuring environment variables, and running the application are consistent with the new PostgreSQL backend.
