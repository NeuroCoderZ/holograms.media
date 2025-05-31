// Core API service for backend communication.

/**
 * Sends the Firebase ID Token to the backend for user synchronization.
 * @param {string} idToken - The Firebase JWT (ID Token).
 * @returns {Promise<Object>} A promise that resolves with the backend's JSON response or rejects with an error.
 */
export async function syncUserAuth(idToken) {
    // PLACEHOLDER_AUTH_SYNC_URL will be replaced with the actual Cloud Function URL
    // once the function is deployed or emulated.
    const AUTH_SYNC_URL = "PLACEHOLDER_AUTH_SYNC_URL/auth_sync";

    try {
        const response = await fetch(AUTH_SYNC_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Empty body as per instructions
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try to parse error message
            const errorMessage = errorData.message || `HTTP error! Status: ${response.status}`;
            throw new Error(`Failed to sync user with backend: ${errorMessage}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in syncUserAuth:", error);
        throw error; // Re-throw to be handled by the caller
    }
}
