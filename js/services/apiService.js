// frontend/js/services/apiService.js

// Указываем базовый URL API из переменных окружения Vite с фоллбеком для локальной разработки
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Отправляет сообщение в чат на бэкенд и поддерживает стриминг ответа.
 * @param {string} text - Текст сообщения от пользователя.
 * @param {string} idToken - JWT токен пользователя для авторизации.
 * @param {string} selectedModel - Выбранная модель (опционально).
 * @param {function} onChunk - Коллбэк для обработки каждого чанка (токена) в реальном времени.
 * @returns {Promise<string>} - Полный текст ответа (после завершения стрима).
 */
export async function sendChatMessage(text, idToken, selectedModel = null, onChunk = null) {
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

        // --- Streaming Logic ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let sseBuffer = "";

        const processEventBlock = (rawEvent) => {
            const dataLines = rawEvent
                .split('\n')
                .filter((line) => line.startsWith('data: '))
                .map((line) => line.slice(6));

            if (dataLines.length === 0) return;

            const payloadText = dataLines.join('\n').trim();
            if (!payloadText) return;

            const data = JSON.parse(payloadText);
            if (data.token) {
                fullText += data.token;
                if (onChunk) onChunk(data.token);
            } else if (data.error) {
                console.error("[apiService] Stream error:", data.error);
                throw new Error(data.error);
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            let separatorIndex = sseBuffer.indexOf('\n\n');
            while (separatorIndex !== -1) {
                const rawEvent = sseBuffer.slice(0, separatorIndex).trim();
                sseBuffer = sseBuffer.slice(separatorIndex + 2);

                if (rawEvent) {
                    try {
                        processEventBlock(rawEvent);
                    } catch (error) {
                        throw error;
                    }
                }

                separatorIndex = sseBuffer.indexOf('\n\n');
            }
        }

        const trailingChunk = decoder.decode();
        if (trailingChunk) sseBuffer += trailingChunk;
        if (sseBuffer.trim()) {
            processEventBlock(sseBuffer.trim());
        }

        if (!fullText.trim()) {
            console.warn('[apiService] Chat stream completed without text tokens.');
        }

        console.log('[apiService] Chat stream finished.');
        return fullText;

    } catch (error) {
        console.error('[apiService] Error during chat message sending:', error);
        throw error;
    }
}


/**
 * Загружает чанк на бэкенд Koyeb.
 * @param {string} userId - ID пользователя.
 * @param {File} file - Файл для загрузки.
 * @param {string} idToken - JWT токен пользователя для авторизации.
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
 * @param {string} idToken - JWT токен пользователя для авторизации.
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

/**
 * Загружает историю чата для указанной сессии.
 * @param {string} sessionId - ID чат-сессии
 * @param {string} idToken - JWT токен пользователя для авторизации
 * @param {number} limit - Количество сообщений (по умолчанию 50)
 * @returns {Promise<Array>} - Массив сообщений
 */
export async function getChatHistory(sessionId, idToken, limit = 50) {
    const historyUrl = `${API_BASE_URL}/api/v1/chat/users/me/chat_sessions/${sessionId}/history?limit=${limit}`;
    console.log(`[apiService] Fetching chat history from ${historyUrl}`);

    try {
        const response = await fetch(historyUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error(`[apiService] History request failed:`, errorData);
            throw new Error(`History request failed: ${errorData.detail || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[apiService] Error fetching chat history:', error);
        return [];
    }
}

/**
 * Получает список чат-сессий пользователя.
 * @param {string} idToken - JWT токен пользователя для авторизации
 * @param {number} limit - Количество сессий (по умолчанию 10)
 * @returns {Promise<Array>} - Массив сессий
 */
export async function listChatSessions(idToken, limit = 10) {
    const sessionsUrl = `${API_BASE_URL}/api/v1/chat/users/me/chat_sessions?limit=${limit}`;
    console.log(`[apiService] Fetching chat sessions from ${sessionsUrl}`);

    try {
        const response = await fetch(sessionsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error(`[apiService] Sessions request failed:`, errorData);
            throw new Error(`Sessions request failed: ${errorData.detail || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[apiService] Error fetching chat sessions:', error);
        return [];
    }
}
