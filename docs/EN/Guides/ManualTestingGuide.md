```markdown
# Manual Testing Guide for the "Holographic Media" Project

**Last updated: September 26, 2025**

## General Principles for Manual Testing

* **Use the latest deployed version:** Always test against the most recent deployed version of the application (frontend and backend).
* **Developer Console:** Use the browser developer console (frontend) and backend logs (Koyeb, Cloudflare Workers, AstraDB) to trace errors and confirm correct behavior.
* **Test Isolation:** Try to isolate test scenarios so results from one test do not affect others.
* **Detailed Reporting:** When bugs or unexpected behavior are found, record reproduction steps, screenshots, console/log messages, and any other relevant details.

---

# Manual End-to-End Test Plans for "Holographic Media"

This section contains detailed manual end-to-end test plans for the project's key functional areas. These plans serve as the primary QA guidance.

---

## E2E Test Plan — Authentication

**Goal:** Verify full authentication flow via Google OAuth 2.0 and JWT validation on the FastAPI backend, including synchronization with AstraDB.

### Preconditions

Ensure the following before running the test plan:

1. The backend (FastAPI on Koyeb) is deployed and reachable.
2. AstraDB (Cassandra) is available and the `users` table/schema exists.
3. Environment variables for Google OAuth 2.0 and AstraDB are configured on the backend.
4. The frontend is deployed (or running locally) and configured to use Google OAuth 2.0.
5. You have access to:
   * Backend logs (Koyeb or local terminal).
   * AstraDB query tools (DataStax Studio, cqlsh).
   * A browser with developer console enabled.

### Test Steps (summary table in the original doc — keep same checks)

Follow the described steps: register a new user via Google sign-in, verify backend logs show token verification and user creation, verify AstraDB `users` table contains the new record, test logout and re-login with the same account, and confirm no duplicate user created.

---

## E2E Test Plan — Upload Interaction Chunk

**Goal:** Validate the full flow of uploading an "interaction chunk" to Backblaze B2 (or R2) and backend processing in FastAPI.

### Preconditions

* User is authenticated (JWT token available).
* Backend is deployed and integrated with Backblaze B2 (or Cloudflare R2) and chunk processing is configured.
* AstraDB is available and `audiovisual_gestural_chunks` schema exists.
* Frontend is deployed and configured to upload files via FastAPI.

### Steps (high level)

1. Use the frontend UI to select and upload a small test media file.
2. Verify frontend shows upload progress and that the request reaches backend (check browser console).
3. Inspect backend logs to confirm receipt, saving to object storage, and metadata processing.
4. Verify the file is present in the object storage (Backblaze B2 or R2).
5. Check AstraDB `audiovisual_gestural_chunks` for a new record with correct metadata.

---

## E2E Test Plan — Hologram Visual and Microphone Response

**Goal:** Validate basic hologram rendering and response to microphone input.

### Preconditions

* Frontend is deployed and accessible in the browser.
* Rendering components (`hologramRenderer.js`, `sceneSetup.js`) and audio chain (`audioAnalyzer.js`, `audioVisualizer.js`, `microphoneManager.js`) are functional.
* Browser has microphone access.

### Steps

1. Open the frontend and verify the base hologram renders without critical console errors.
2. Click the Mic button to request microphone permission and start audio capture.
3. Produce audio near the microphone and verify the hologram reacts dynamically to sound levels.
4. Toggle the Mic button off and verify audio capture stops and the hologram returns to idle behavior.

---

## E2E Test Plan — Tria Agent Interaction

**Goal:** Validate chat interaction with the Tria agent via the FastAPI backend on Koyeb.

### Preconditions

* User is authenticated.
* Backend is deployed and `ChatAgent` / `LLMService` are configured (Mistral or other model access).
* AstraDB and `tria_learning_log` table are available.

### Steps

1. Send a chat message from frontend.
2. Verify frontend shows the message and an in-progress indicator.
3. Inspect backend logs to confirm request handling, token validation and invocation of the LLM service.
4. Confirm the agent response appears in the frontend chat.
5. Verify that `tria_learning_log` contains an entry for the interaction.

---

## Backend & Database Testing Strategy (AstraDB/Cassandra)

This section describes approaches for unit tests (mocking Cassandra interactions) and integration tests for key FastAPI endpoints using a test AstraDB instance. It includes methods for mocking, assertions to validate queries and payloads, and cleanup/initialization steps for reliable test runs.

---

## Notes on Future Vector Search Testing

If vector-based features (indexing, similarity search) are used, plan integration tests that populate a test AstraDB with sample embeddings and validate `store_*` and `find_similar_*` operations.

---

Always refer to the current architecture in `../Architecture/` when performing testing and updating these documents.

```
