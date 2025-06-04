// frontend/js/services/apiService.js

// Плейсхолдер для URL вашего бэкенд-приложения на Koyeb
export const API_BASE_URL = 'YOUR_KOYEB_APP_URL_PLACEHOLDER'; // Замените на реальный URL или оставьте как плейсхолдер для инструкции

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

// Можно добавить другие функции для взаимодействия с API здесь по мере необходимости
// Например:
// export async function getGestures(userId, idToken) { ... }
// export async function getHolograms(userId, idToken) { ... }
