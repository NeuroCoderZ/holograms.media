// frontend/js/core/services/apiService.js

// Core API service for backend communication.

// ВАЖНО (НейроКодер): Перед E2E тестированием или деплоем необходимо заменить
// плейсхолдеры YOUR_PROJECT_ID и YOUR_REGION на ваши актуальные значения,
// ИЛИ раскомментировать и настроить вариант для локального эмулятора.

// Вариант 1: Для развернутых Cloud Functions (замените плейсхолдеры!)
const API_BASE_URL = 'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net';

// Вариант 2: Для локального тестирования с Firebase Emulator (раскомментируйте и замените плейсхолдеры, если нужно)
// const API_BASE_URL = 'http://127.0.0.1:5001/YOUR_PROJECT_ID/YOUR_REGION';

// Проверка, что URL был изменен с плейсхолдеров (кроме случая, когда он пуст для эмулятора по умолчанию)
if (API_BASE_URL && (API_BASE_URL.includes('YOUR_PROJECT_ID') || API_BASE_URL.includes('YOUR_REGION'))) {
    console.warn(
        `API_BASE_URL в apiService.js (${API_BASE_URL}) все еще содержит плейсхолдеры YOUR_PROJECT_ID/YOUR_REGION! ` +
        `Замените их на актуальные значения или выберите правильный вариант для локального эмулятора/развернутых функций.`
    );
} else if (API_BASE_URL === '') { // Если оставили пустым для эмулятора, который сам резолвит по имени функции
    console.info(
        'API_BASE_URL в apiService.js пуст. Предполагается использование с Firebase Emulator, который может резолвить URL по имени функции. ' +
        'Для развернутых функций URL должен быть явно указан.'
    );
}


/**
 * Sends the Firebase ID token to the backend for user synchronization.
 * @param {string} idToken - The Firebase JWT (ID Token).
 * @returns {Promise<Object>} A promise that resolves with the backend's JSON response or rejects with an error.
 */
export async function syncUserAuth(idToken) {
    if (!API_BASE_URL && API_BASE_URL !=='') { // Проверяем, что не пустая строка И не плейсхолдер
        const message = "API_BASE_URL is not configured in apiService.js. Cannot sync user.";
        console.error(message);
        return Promise.reject(new Error(message));
    }
    const AUTH_SYNC_URL = API_BASE_URL ? `${API_BASE_URL}/auth_sync` : '/auth_sync'; // /auth_sync если API_BASE_URL пуст для эмулятора

    try {
        const response = await fetch(AUTH_SYNC_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ responseText: await response.text() }));
            const errorMessage = errorData.message || errorData.error || errorData.responseText || `HTTP error! Status: ${response.status}`;
            console.error('Error syncing user with backend:', response.status, errorMessage);
            throw new Error(`Backend user sync failed: ${errorMessage}`);
        }

        // Handle cases where response might be empty (e.g., 201 or 204 with no content)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return { status: response.status, message: "User sync processed." }; 
        }
    } catch (error) {
        console.error("Error in syncUserAuth:", error);
        throw error;
    }
}

/**
 * Sends a chat message to the backend Tria chat handler Cloud Function.
 * @param {string} messageText - The text content of the chat message.
 * @param {string} idToken - The Firebase JWT (ID Token) of the authenticated user.
 * @returns {Promise<Object>} A promise that resolves with the backend's JSON response or rejects with an error.
 */
export async function sendChatMessage(messageText, idToken) {
    if (!API_BASE_URL && API_BASE_URL !=='') {
        const message = "API_BASE_URL is not configured in apiService.js. Cannot send chat message.";
        console.error(message);
        return Promise.reject(new Error(message));
    }
    const TRIA_CHAT_HANDLER_URL = API_BASE_URL ? `${API_BASE_URL}/tria_chat_handler` : '/tria_chat_handler';

    try {
        const response = await fetch(TRIA_CHAT_HANDLER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: messageText })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ responseText: await response.text() }));
            const errorMessage = errorData.message || errorData.error || errorData.responseText || `HTTP error! Status: ${response.status}`;
            console.error('Error sending message to Tria bot:', response.status, errorMessage);
            throw new Error(`Tria bot request failed: ${errorMessage}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return { status: response.status, message: "Chat message processed." };
        }
    } catch (error) {
        console.error("Error in sendChatMessage:", error);
        throw error;
    }
}
