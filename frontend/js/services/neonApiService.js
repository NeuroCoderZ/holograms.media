// frontend/js/services/neonApiService.js
import { PostgrestClient } from '@supabase/postgrest-js';
// import { getAuth } from 'firebase/auth'; // Используем модульный SDK Firebase - это было в задании, но state.auth уже должен быть инициализирован
import { state } from '../core/init.js'; // Для доступа к нашему глобальному состоянию Firebase auth

class NeonApiService {
    constructor() {
        // URL будет браться из переменных окружения Vite
        this.dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;
        if (!this.dataApiUrl) {
            console.error("CRITICAL: VITE_NEON_DATA_API_URL is not set in .env file! NeonApiService will not work.");
            // Можно выбросить ошибку или установить URL в null, чтобы предотвратить попытки вызова
            // throw new Error("VITE_NEON_DATA_API_URL is not configured.");
        }
        // Инициализируем клиент только если URL доступен
        this.client = this.dataApiUrl ? new PostgrestClient(this.dataApiUrl) : null;
        if (this.client) {
            console.log("NeonApiService: Initialized with URL:", this.dataApiUrl);
        } else {
            console.warn("NeonApiService: Not initialized due to missing VITE_NEON_DATA_API_URL.");
        }
    }

    /**
     * Приватный метод для получения и установки актуального JWT токена
     */
    async _applyAuth() {
        if (!this.client) {
            throw new Error('NeonApiService client not initialized. Check VITE_NEON_DATA_API_URL.');
        }

        // Используем state.auth, который должен быть инициализирован в firebaseInit.js (или аналогичном месте)
        // и содержать инстанс firebase.auth.Auth.
        // В main.js мы не видим явной инициализации state.auth, но предполагаем, что она происходит где-то.
        // Если state.auth или state.auth.currentUser не существует, это проблема инициализации Firebase.
        if (!state.auth || typeof state.auth.currentUser === 'undefined') {
            console.error("NeonApiService: Firebase auth state (state.auth or state.auth.currentUser) is not available.");
            throw new Error('Firebase auth not initialized or user not available in state.');
        }

        const user = state.auth.currentUser; // Доступ к currentUser напрямую из auth объекта

        if (user) {
            try {
                const token = await user.getIdToken(true); // true - для принудительного обновления, если он истек
                this.client.auth(token);
                // console.log("NeonApiService: Firebase token applied to PostgrestClient.");
            } catch (error) {
                console.error("NeonApiService: Error getting Firebase ID token:", error);
                this.client.auth(null); // Сбрасываем токен в случае ошибки его получения
                throw new Error('Failed to get Firebase ID token.');
            }
        } else {
            // Если пользователя нет (не аутентифицирован), сбрасываем токен.
            // Запросы будут идти как анонимные, и RLS политики должны их блокировать, если не разрешено.
            console.warn("NeonApiService: No authenticated user. Requests will be anonymous.");
            this.client.auth(null);
            throw new Error('User not authenticated. Cannot fetch user-specific data.');
        }
    }

    /**
     * Получает голограммы текущего пользователя
     */
    async fetchUserHolograms() {
        if (!this.client) {
            console.error('NeonApiService (fetchUserHolograms): Client not initialized.');
            throw new Error('NeonApiService client not initialized.');
        }
        try {
            await this._applyAuth(); // Применяем токен перед каждым запросом, требующим аутентификации

            console.log("NeonApiService: Fetching user holograms...");
            const { data, error, status, statusText } = await this.client
                .from('user_holograms') // Имя таблицы
                .select('*') // Выбираем все поля
                .order('created_at', { ascending: false });

            if (error) {
                console.error('NeonApiService Error (fetchUserHolograms):', status, statusText, error);
                throw error; // Перебрасываем ошибку PostgREST
            }
            console.log("NeonApiService: User holograms fetched successfully:", data);
            return data;
        } catch (error) {
            // Если _applyAuth выбросил ошибку (например, пользователь не аутентифицирован),
            // она будет поймана здесь.
            console.error('NeonApiService Exception (fetchUserHolograms):', error.message || error);
            // Можно вернуть пустой массив или специальный объект ошибки, чтобы UI мог это обработать
            // throw error; // Перебрасываем ошибку дальше, чтобы вызывающий код мог ее обработать
            return []; // Возвращаем пустой массив в случае ошибки, чтобы UI не падал
        }
    }

    // ... (в будущем здесь будут другие методы: create, update, delete для user_holograms и user_gesture_definitions) ...

    /**
     * Пример: Получает определения жестов текущего пользователя
     */
    async fetchUserGestureDefinitions() {
        if (!this.client) {
            console.error('NeonApiService (fetchUserGestureDefinitions): Client not initialized.');
            throw new Error('NeonApiService client not initialized.');
        }
        try {
            await this._applyAuth();

            console.log("NeonApiService: Fetching user gesture definitions...");
            const { data, error, status } = await this.client
                .from('user_gesture_definitions') // Имя таблицы
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                 console.error('NeonApiService Error (fetchUserGestureDefinitions):', status, error);
                throw error;
            }
            console.log("NeonApiService: User gesture definitions fetched successfully:", data);
            return data;
        } catch (error) {
            console.error('NeonApiService Exception (fetchUserGestureDefinitions):', error.message || error);
            return [];
        }
    }
}

// Экспортируем синглтон-экземпляр
export const neonApiService = new NeonApiService();
