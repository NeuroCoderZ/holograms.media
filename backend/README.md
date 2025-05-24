# Holographic Media Backend

This directory contains the server-side application logic for the Holographic Media project, built with FastAPI.

## Structure

- **/api**: Contains API endpoint definitions, versioned for clarity.
    - **/v1**: Version 1 of the API.
        - **/endpoints**: Specific endpoint modules (e.g., for interaction chunks, Tria commands).
- **/db**: Handles database interactions, primarily with PostgreSQL and pgvector.
    - `pg_connector.py`: Manages database connections.
    - `crud_operations.py`: Provides functions for common database operations.
- **/models**: Defines Pydantic models for data validation, serialization, and ORM-like structures.
- **/services**: Implements the core business logic, orchestrating data flow and interactions between components.
- **/tria_bots**: Contains the modules for each specialized AI bot in the Tria network and their coordination.
- `app.py`: The main FastAPI application entry point.
- `requirements.txt`: Python package dependencies.

## TODO
- Fully implement connection pooling in `pg_connector.py`.
- Develop comprehensive CRUD operations with pgvector integration.
- Flesh out all Pydantic models for API requests/responses and DB tables.
- Implement core logic in service modules.
- Integrate Tria bot functionalities.
- Add robust authentication and authorization.
- Set up comprehensive testing.
