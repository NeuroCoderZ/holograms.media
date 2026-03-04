/**
 * VersionService.js — ТЗ v4.5 Этап 4
 * =====================================
 * Сервис для работы с историей версий через GitHub API.
 * Позволяет получать список коммитов и использовать их как "состояния" проекта.
 */

export class VersionService {
    constructor() {
        this.repoOwner = 'NeuroCoderZ';
        this.repoName = 'holograms.media';

        // Use VITE_API_URL if available (Cloudflare Pages), otherwise default to relative path
        const baseUrl = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL
            : '/api/v1';

        this.apiUrl = `${baseUrl}/github/commits`;
    }

    /**
     * Получает список последних коммитов из основной ветки.
     * @param {number} limit - Количество коммитов для загрузки.
     * @returns {Promise<Array>} - Массив объектов версий.
     */
    async fetchVersions(limit = 10) {
        try {
            console.log(`[VersionService] Fetching commits from backend proxy...`);

            const response = await fetch(`${this.apiUrl}?sha=dev&per_page=${limit}`);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const commits = await response.json();

            // Маппим данные коммитов в формат, понятный таймлайну
            return commits.map(commit => ({
                id: commit.sha,
                prompt: commit.commit.message, // В ТЗ v4.5 сообщение коммита используется как описание версии
                author: commit.commit.author.name,
                date: commit.commit.author.date,
                url: commit.html_url,
                displayId: commit.sha.substring(0, 7) // Короткий SHA
            }));
        } catch (error) {
            console.error('[VersionService] Error fetching versions:', error);
            return []; // Возвращаем пустой массив в случае ошибки
        }
    }

    /**
     * Получает детали конкретного коммита (дифф, файлы).
     * @param {string} sha - SHA коммита.
     */
    async getVersionDetails(sha) {
        try {
            const response = await fetch(`${this.apiUrl}/${sha}`);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[VersionService] Error fetching details for ${sha}:`, error);
            return null;
        }
    }
}

const versionService = new VersionService();
export default versionService;
