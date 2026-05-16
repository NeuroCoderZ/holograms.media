/**
 * @file auth.js
 * @description Управляет аутентификацией пользователей через Google Identity Services.
 *              Обрабатывает получение токена от Google, обмен его на JWT-токен бэкенда
 *              и управление сессией пользователя.
 */

import { state } from './init.js';
import { updateAuthUI } from '../ui/uiManager.js';
import { showNotification } from '../utils/notifications.js';

// URL-ы теперь берутся динамически через getAuthConfig()

/**
 * Получает конфигурацию аутентификации на основе переменных окружения.
 * @returns {Object} Объект с clientId, environment, apiUrl, redirectUri
 */
export const getAuthConfig = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
  const redirectUri = import.meta.env.VITE_AUTH_REDIRECT_URI;

  console.log(`[Auth] Environment: ${environment}`, `Client: ${clientId?.substring(0, 15)}...`);

  return { clientId, environment, apiUrl, redirectUri };
};

/**
 * Динамически загружает скрипт Google Sign-In.
 * @returns {Promise<void>}
 */
function loadGoogleGsiScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Обрабатывает ответ от Google Sign-In.
 * @param {object} response - Объект ответа от Google.
 */
async function handleGoogleCredentialResponse(response) {
  const googleIdToken = response.credential;
  console.log('Получен Google ID токен:', googleIdToken);

  try {
    const { apiUrl } = getAuthConfig();
    const backendResponse = await fetch(`${apiUrl}/api/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: googleIdToken }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[Auth] Backend Error Logic:', backendResponse.status, errorText);
      throw new Error(`Ошибка бэкенда (${backendResponse.status}): ${errorText.substring(0, 100)}`);
    }

    const responseData = await backendResponse.json();
    console.log('Получен JWT от бэкенда.');

    localStorage.setItem('jwtToken', responseData.access_token);
    state.isAuthenticated = true;

    // Сохраняем информацию о пользователе из ответа бэкенда
    state.user = {
      email: responseData.email,
      role: responseData.role,
      environment: responseData.environment
    };

    updateAuthUI();
    showNotification(`С возвращением, ${state.user.role}!`, 'success');

    const modal = document.getElementById('start-session-modal');
    if (modal) modal.style.display = 'none';

  } catch (error) {
    console.error('Ошибка при обмене токена Google на JWT:', error);
    showNotification('Ошибка аутентификации.', 'error');
    signOut();
  }
}

/**
 * Инициализирует Google Identity Services и отрисовывает кнопку входа.
 */
async function initializeGoogleSignIn() {
  if (window.google) {
    const { clientId } = getAuthConfig();
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
      ux_mode: 'popup', // Явно указываем всплывающее окно
      auto_select: false, // Запрещаем авто-вход, чтобы всегда был выбор аккаунта
      use_fedcm_for_prompt: true // [FIX] FedCM обязателен для обхода блокировок 3rd-party cookies и COOP
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-container'),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 300 // Фиксированная ширина для стабильности
      }
    );
    window.google.accounts.id.prompt(); // Показывает One Tap UI (нативный FedCM)
  } else {
    console.error('Объект Google GSI не найден.');
  }
}

/**
 * Проверяет наличие JWT в localStorage при загрузке страницы.
 */
async function checkInitialAuthState() {
  const token = localStorage.getItem('jwtToken');
  if (token) {
    try {
      // Проверяем валидность токена через запрос "кто я?"
      // Используем полный URL из конфигурации, так как Cloudflare Pages не проксирует /api/v1 локально
      const { apiUrl } = getAuthConfig();
      const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        state.isAuthenticated = true;
        state.user = userData;
        console.log(`[Auth] Сессия восстановлена для: ${userData.email}`);

        // Скрываем модалку входа
        const modal = document.getElementById('start-session-modal');
        if (modal) modal.style.display = 'none';
      } else {
        console.warn('[Auth] Токен невалиден или протух.');
        localStorage.removeItem('jwtToken');
        state.isAuthenticated = false;
      }
    } catch (error) {
      console.error('[Auth] Ошибка проверки сессии:', error);
      // При сетевой ошибке не сбрасываем, может бэкенд спит
      state.isAuthenticated = true;
    }
  } else {
    state.isAuthenticated = false;
    console.log('[Auth] Сессия не найдена.');
  }
  updateAuthUI();
}

/**
 * Выполняет выход пользователя из системы.
 */
export function signOut() {
  localStorage.removeItem('jwtToken');
  state.isAuthenticated = false;
  state.user = null;

  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }

  console.log('Пользователь вышел из системы.');
  updateAuthUI();
  showNotification('Вы вышли из системы.', 'info');
}

/**
 * Главная функция инициализации модуля аутентификации.
 */
export async function initAuth() {
  try {
    await loadGoogleGsiScript();
    await initializeGoogleSignIn();
    checkInitialAuthState();

    // Слушаем событие истечения сессии от NetHoloGlyphClient
    import('../core/eventBus.js').then(({ default: eventBus }) => {
      eventBus.on('netHoloGlyph:sessionExpired', (data) => {
        const btn = document.getElementById('login-google-btn');
        if (btn) {
          btn.classList.add('session-expired');
          btn.title = data.message || 'Сессия истекла. Переавторизуйтесь через Google.';
          // Убираем пульсацию после повторного входа
          const observer = new MutationObserver(() => {
            if (btn.classList.contains('authenticated')) {
              btn.classList.remove('session-expired');
              observer.disconnect();
            }
          });
          observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
        }
        showNotification(data.message || 'Сессия истекла. Переавторизуйтесь через Google.', 'warning');
      });
    });
  } catch (error) {
    console.error('Не удалось загрузить или инициализировать Google GSI:', error);
    showNotification('Не удалось загрузить сервис аутентификации.', 'error');
  }
}

/**
 * Возвращает текущий JWT токен.
 * @returns {string|null}
 */
export function getJwtToken() {
  return localStorage.getItem('jwtToken');
}

/**
 * Проверяет, истёк ли JWT токен.
 * @param {string} token - JWT токен
 * @returns {boolean} true если токен истёк или невалиден
 */
export function isJwtExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    // 60-секундный буфер для предотвращения race condition
    return payload.exp < (now + 60);
  } catch {
    return true;
  }
}

/**
 * Глобальный 401-interceptor для fetch-запросов.
 * Автоматически редиректит на re-auth при получении 401.
 * @param {Response} response - Ответ от fetch
 * @param {string} url - URL запроса
 * @returns {boolean} true если нужно повторить запрос после re-auth
 */
export async function handle401Response(response, url) {
  if (response.status !== 401) return false;

  console.warn('[Auth] 401 Unauthorized from:', url);

  // Проверяем, не является ли это запросом к auth endpoint (чтобы избежать бесконечного цикла)
  if (url?.includes('/auth/')) {
    localStorage.removeItem('jwtToken');
    state.isAuthenticated = false;
    updateAuthUI();
    return false;
  }

  // Проверяем, не истёк ли токен
  const token = getJwtToken();
  if (isJwtExpired(token)) {
    console.warn('[Auth] JWT expired — triggering re-auth');
    localStorage.removeItem('jwtToken');
    state.isAuthenticated = false;
    updateAuthUI();

    // Показываем уведомление с предложением переавторизоваться
    showNotification('Сессия истекла. Войдите снова через Google.', 'warning');

    // Показываем модалку входа
    const modal = document.getElementById('start-session-modal');
    if (modal) modal.style.display = 'flex';

    // Dispatch event для других модулей
    import('../core/eventBus.js').then(({ default: eventBus }) => {
      eventBus.emit('auth:sessionExpired', { url });
    });
  }

  return false;
}

/**
 * Обёртка над fetch с автоматической обработкой 401.
 * @param {string} url - URL запроса
 * @param {object} options - Опции fetch
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  const token = getJwtToken();
  if (token && !options.headers?.['Authorization']) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  const response = await fetch(url, options);
  await handle401Response(response, url);
  return response;
}