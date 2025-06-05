// frontend/js/services/apiService.js

// Плейсхолдер для URL вашего бэкенд-приложения на Koyeb
export const API_BASE_URL = 'https://your-app-name-your-org.koyeb.app'; // TODO: Replace with actual Koyeb URL

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
