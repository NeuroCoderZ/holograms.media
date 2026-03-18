// frontend/js/services/apiService.js

// Указываем базовый URL API из переменных окружения Vite с фоллбеком для локальной разработки
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Отправляет сообщение в чат на бэкенд и возвращает ответ от Tria.
 * @param {string} text - Текст сообщения от пользователя.
 * @param {string} idToken - Firebase ID токен пользователя для аутентификации.
 * @returns {Promise<string>} - Текстовый ответ от Tria.
 * @throws {Error} - Если произошла ошибка при отправке или ответ сервера не OK.
 */
export async function sendChatMessage(text, idToken, selectedModel = null) {
    const chatUrl = `${API_BASE_URL}/api/v1/chat/users/me/chat_sessions/direct`;
    console.log(`[apiService] Sending chat message to ${chatUrl}`);

    try {
        const response = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                user_chat_session_id: 0, // Backend will find/create automatically for 'direct'
                role: "user",
                message_content: text,
                metadata: selectedModel ? { llm_model: selectedModel } : {}
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown chat error' }));
            console.error(`[apiService] Chat request failed with status ${response.status}:`, errorData);
            throw new Error(`Chat request failed: ${errorData.detail || response.statusText}`);
        }

        const responseData = await response.json();
        console.log('[apiService] Chat response received:', responseData);
        return responseData.message_content; // В новой модели это message_content

    } catch (error) {
        console.error('[apiService] Error during chat message sending:', error);
        throw error;
    }
}


/**
 * Загружает чанк на бэкенд Koyeb.
 * @param {string} userId - ID пользователя Firebase.
 * @param {File} file - Файл для загрузки.
 * @param {string} idToken - Firebase ID токен пользователя.
 * @returns {Promise<object>} - Ответ от сервера в формате JSON.
 * @throws {Error} - Если произошла ошибка при загрузке или ответ сервера не OK.
 */
export async function uploadChunk(userId, file, idToken) {
    const uploadUrl = `${API_BASE_URL}/api/v1/upload_chunk/${userId}`;

    const formData = new FormData();
    formData.append('file', file); // 'file' должно совпадать с именем параметра File() в FastAPI

    console.log(`[apiService] Uploading chunk for user ${userId} to ${uploadUrl}`);
    console.log(`[apiService] File: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                // 'Content-Type': 'multipart/form-data' // fetch автоматически установит Content-Type с boundary для FormData
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error during upload, and error response parsing failed.' }));
            console.error(`[apiService] Upload failed with status ${response.status}:`, errorData);
            throw new Error(`Upload failed: ${errorData.detail || response.statusText}`);
        }

        const responseData = await response.json();
        console.log('[apiService] Upload successful:', responseData);
        return responseData;

    } catch (error) {
        console.error('[apiService] Error during chunk upload:', error);
        // Перевыбрасываем ошибку, чтобы ее можно было обработать в вызывающем коде (uiManager)
        throw error;
    }
}


/**
 * Requests a presigned URL from the backend.
 * @param {string} filename - The name of the file.
 * @param {string} contentType - The content type of the file.
 * @param {string} idToken - Firebase ID token for authorization.
 * @returns {Promise<object>} - Object containing url, fields, and object_key.
 * @throws {Error} if the request fails.
 */
export async function getPresignedUrl(filename, contentType, idToken) {
    const requestUrl = `${API_BASE_URL}/api/v1/generate-upload-url`;
    console.log(`[apiService] Requesting presigned URL for ${filename} (${contentType}) from ${requestUrl}`);

    try {
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ filename, content_type: contentType }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to get presigned URL and error response parsing failed.' }));
            console.error(`[apiService] Failed to get presigned URL with status ${response.status}:`, errorData);
            throw new Error(`Failed to get presigned URL: ${errorData.detail || response.statusText}`);
        }

        const responseData = await response.json();
        console.log('[apiService] Presigned URL received:', responseData);
        return responseData;
    } catch (error) {
        console.error('[apiService] Error getting presigned URL:', error);
        throw error;
    }
}


// Можно добавить другие функции для взаимодействия с API здесь по мере необходимости
// Например:
// export async function getGestures(userId, idToken) { ... }
// export async function getHolograms(userId, idToken) { ... }