// Core API service for backend communication.

// Placeholder for the base URL of your Cloud Functions
// This should be configured for your specific Firebase project and region
// Example: 'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net'
const API_BASE_URL = ''; // TODO: Configure this before deployment!

/**
 * Sends the Firebase ID token to the backend for user synchronization.
 * @param {string} idToken - The Firebase ID token.
 * @returns {Promise<any>} A promise that resolves with the backend's JSON response or rejects with an error.
 */
export async function syncUserAuth(idToken) {
    if (!API_BASE_URL) {
        console.error("API_BASE_URL is not configured in apiService.js. Cannot sync user.");
        return Promise.reject("API base URL not configured.");
    }
    const response = await fetch(`${API_BASE_URL}/auth_sync`, { // Assuming 'auth_sync' is the function name
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({}) // Empty body as per instructions
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('Error syncing user with backend:', response.status, errorData);
        throw new Error(`Backend user sync failed: ${response.status} ${errorData}`);
    }
    return response.json();
}

/**
 * Sends a chat message to the Tria backend.
 * @param {string} message - The message text.
 * @param {string} idToken - The Firebase ID token for authentication.
 * @returns {Promise<any>} A promise that resolves with the Tria bot's response.
 */
export async function sendChatMessage(message, idToken) {
    if (!API_BASE_URL) {
        console.error("API_BASE_URL is not configured in apiService.js. Cannot send chat message.");
        return Promise.reject("API base URL not configured.");
    }
    const response = await fetch(`${API_BASE_URL}/tria_chat_handler`, { // Assuming 'tria_chat_handler' is the function name
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: message }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('Error sending message to Tria bot:', response.status, errorData);
        throw new Error(`Tria bot request failed: ${response.status} ${errorData}`);
    }
    return response.json();
}

// You can add other API service functions here as needed.
