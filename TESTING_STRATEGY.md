# Testing Strategy: MongoDB to PostgreSQL Migration

This document outlines the testing strategy for verifying the successful migration from MongoDB to PostgreSQL for the TRIA backend application.

## 1. Unit Tests for `crud_operations.py`

**Focus:** Test each CRUD function in `backend/db/crud_operations.py` individually to ensure correct interaction logic with the database connection, proper handling of inputs, and expected outputs or exceptions.

**Method:**
*   Utilize a mocking library such as `unittest.mock.AsyncMock` for Python's `asyncio` environments.
*   Mock the `asyncpg.Connection` object passed to the CRUD functions.
*   Mock methods of the connection object like `fetchval`, `fetchrow`, `fetch`, and `execute` to simulate database responses.
*   Mock `asyncpg.Record` for functions that return database records.

**Assertions:**
*   **Correct SQL Query Logic (Conceptual):** While directly asserting the exact SQL string can be brittle with mocks, ensure the mocked DB methods are called with parameters that imply the correct query logic. For example, for a `WHERE id = $1` clause, check that the correct `id` value is passed to the mock.
*   **Parameter Passing:** Verify that the function arguments are correctly passed to the mocked `asyncpg` methods (e.g., `conn.fetchval(query, arg1, arg2)`).
*   **Return Value Handling:**
    *   Ensure the CRUD function returns the expected value based on the mocked DB method's return (e.g., a user ID from `fetchval`, a mocked `Record` from `fetchrow`, a list of mocked `Record`s from `fetch`, or a status string from `execute`).
    *   Test scenarios where the database returns no data (e.g., `fetchrow` returns `None`).
*   **Exception Handling:**
    *   Mock DB methods to raise `asyncpg.PostgresError` (and its sub-classes if specific handling exists) and verify that the CRUD function catches it and returns the expected error indicator (e.g., `None` or `False`).
    *   Mock DB methods to raise generic `Exception` to test unexpected error handling.

**Examples:**

*   **`create_user(conn, username, hashed_password, email)`:**
    *   Mock `conn.fetchval` to return a sample integer (e.g., `1`).
    *   Assert that `create_user` returns this integer.
    *   Mock `conn.fetchval` to raise `asyncpg.UniqueViolationError`. Assert `create_user` returns `None`.
*   **`get_user_by_username(conn, username)`:**
    *   Mock `conn.fetchrow` to return a mocked `asyncpg.Record` object. Assert `get_user_by_username` returns this record.
    *   Mock `conn.fetchrow` to return `None`. Assert `get_user_by_username` returns `None`.
*   **`update_user_email(conn, user_id, new_email)`:**
    *   Mock `conn.execute` to return `"UPDATE 1"`. Assert `update_user_email` returns `True`.
    *   Mock `conn.execute` to return `"UPDATE 0"`. Assert `update_user_email` returns `False`.

## 2. Integration Tests for FastAPI Endpoints

**Focus:** Test key API endpoints that now interact with PostgreSQL to ensure they function correctly from request to response, including database interactions.

**Method:**
*   Use an async HTTP client like `httpx` with `ASGITransport` to make requests to the FastAPI application.
*   Requires a live, accessible **test PostgreSQL database instance**. This database should be:
    *   Initialized with the schema from `backend/db/schema.sql` before tests run.
    *   Ideally, seeded with specific test data for certain test cases.
*   The application should be configured to connect to this test database (e.g., via environment variables for `pg_connector.py`).

**Endpoints to Test & Key Checks:**

*   **`/health` (GET):**
    *   Assert a `200 OK` status code.
    *   Assert the response body is `{"status": "ok", "postgres": "connected"}`.

*   **`/chat` (POST):**
    *   **Valid Request:**
        *   Send a valid `ChatRequest` (e.g., `{"message": "Hello TRIA"}`).
        *   Assert a `200 OK` status code.
        *   Assert the `ChatResponse` structure, including `response` (string), `should_vocalize` (boolean), and `metadata`.
        *   Verify `metadata.chat_id` (which is the `session_id`) is a non-empty string (UUID).
        *   Verify `metadata.assistant_message_id` is present and corresponds to the saved assistant message ID.
        *   **Database Verification (Optional but Recommended):**
            *   Connect to the test PostgreSQL database directly using an `asyncpg` client.
            *   Query the `chat_history` table for the `session_id` from the response.
            *   Verify that two messages (user and assistant) were saved with the correct `role`, `message_content`, and `session_id`.
    *   **Invalid/Edge Case Requests (if applicable):**
        *   Test how the endpoint handles empty messages or other potentially problematic inputs if specific validation is expected beyond Pydantic.

*   **`/api/chat_history/{session_id}` (GET):**
    *   **Setup:** First, make a POST request to `/chat` to create a chat session and get a `session_id`.
    *   **Valid Request:**
        *   Use the `session_id` from the `/chat` response to make a GET request.
        *   Assert a `200 OK` status code.
        *   Assert the response structure: `{"messages": [...], "session_id": "...", "count": ...}`.
        *   Verify the `messages` array contains the expected messages (e.g., the "Hello TRIA" user message and the assistant's response). Check `role` and `content`.
    *   **Invalid `session_id`:**
        *   Make a GET request with a non-existent `session_id` (e.g., a random UUID).
        *   Assert that the endpoint returns an appropriate response (e.g., `200 OK` with an empty message list, or `404 Not Found` if designed that way, though current implementation likely returns empty list).

**Data:**
*   Test with valid inputs to ensure normal operation.
*   Test with invalid inputs (e.g., incorrect types if not caught by Pydantic, missing required fields if Pydantic validation is bypassed or flawed) to check error handling, though FastAPI handles Pydantic validation errors by default with a 422 response.

**Setup/Teardown:**
*   **Database State:**
    *   Before each test suite (or individual test, if necessary), ensure the test database tables are truncated (e.g., `TRUNCATE TABLE users, chat_history, ... CASCADE;`) to maintain test isolation.
    *   The schema should be applied once before all tests.
*   **Application Instance:** A fresh application instance should be used for tests with `TestClient` or `httpx.ASGITransport`.

## 3. Manual Testing

**Focus:** Verify the end-to-end user experience and overall application stability, particularly for the core chat functionality.

**Method:**
*   Run the backend application locally, configured to connect to a development or test PostgreSQL database.
*   Use the actual frontend application (if available and configured to point to the local backend) or API testing tools like Postman or `curl`.

**Checks:**
*   **Chat Functionality:**
    *   Send messages through the `/chat` endpoint. Verify that responses are received and appear sensible.
    *   Use the `/api/chat_history/{session_id}` endpoint (or the frontend's history view) to confirm that messages (both user and assistant) are being saved and retrieved correctly and in the right order.
    *   Check `session_id` persistence and usage across related interactions.
*   **No Regressions:** Ensure that chat behavior, response quality (from LLM), and any other related features have not been negatively impacted by the database migration.
*   **Application Logs:** Monitor the backend application's console output and, if applicable, the `application_logs` table in PostgreSQL for any errors, warnings, or unexpected behavior related to PostgreSQL operations.
*   **Data Integrity:** Spot-check data in the PostgreSQL database tables to ensure it's being stored in the correct format (e.g., JSONB fields, timestamps with timezones).

## 4. `pgvector` Specific Tests (Future Consideration)

**Note:** While the full implementation and optimization of `pgvector` features (like HNSW/IVFFlat indexes and complex similarity searches) might be scheduled for later, basic tests should be planned if any vector-related CRUD functions (`store_av_chunk`, `find_similar_chunks`, etc.) are already being used, even if minimally.

**Method (Integration Tests):**
*   **Setup:**
    *   Ensure the `vector` extension is enabled in the test PostgreSQL database (`CREATE EXTENSION IF NOT EXISTS vector;`).
    *   Seed the database with a small number of sample items that include vector embeddings (e.g., in `audiovisual_gestural_chunks` or `tria_knowledge_base`). The embeddings should have known relationships (e.g., some are very similar, others very different).
*   **Tests for `store_*` functions with embeddings:**
    *   Verify that data with valid vector embeddings can be stored successfully.
    *   Test storing data with incorrectly formatted or dimensioned vectors (expecting errors).
*   **Tests for `find_similar_*` functions:**
    *   Use a known query embedding.
    *   Assert that the function returns the expected number of results (`top_k`).
    *   Assert that the returned items are plausible matches. For simple, controlled test data, you might be able to assert that specific known similar items are returned.
    *   Check that the `distance` field is present and makes sense (e.g., smaller for more similar items).

This testing strategy aims to provide comprehensive coverage for the migration, ensuring data integrity, API functionality, and overall application stability.
