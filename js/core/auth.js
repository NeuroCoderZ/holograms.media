/**
 * @file auth.js
 * @description Управляет аутентификацией пользователей через Google Identity Services.
 *              Обрабатывает получение токена от Google, обмен его на JWT-токен бэкенда
 *              и управление сессией пользователя.
 */

import { state } from './state.js';
import { updateAuthUI } from '../managers/uiManager.js';
import { showNotification } from '../utils/notifications.js';

const BACKEND_TOKEN_URL = '/api/v1/auth/token';

/**
 * Получает конфигурацию аутентификации на основе переменных окружения.
 * @returns {Object} Объект с clientId, environment, apiUrl, redirectUri
 */
export const getAuthConfig = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5173';
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
    const backendResponse = await fetch(BACKEND_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: googleIdToken }),
    });

    if (!backendResponse.ok) {
      throw new Error(`Ошибка бэкенда: ${backendResponse.statusText}`);
    }

    const { access_token } = await backendResponse.json();
    console.log('Получен JWT от бэкенда.');

    localStorage.setItem('jwtToken', access_token);
    state.isAuthenticated = true;
    // TODO: Получить и сохранить информацию о пользователе.
    // state.user = ...;

    updateAuthUI();
    showNotification('Аутентификация прошла успешно!', 'success');
    document.getElementById('start-session-modal').style.display = 'none';

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
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-container'),
      { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular' }
    );
    // window.google.accounts.id.prompt(); // Показывает One Tap UI
  } else {
    console.error('Объект Google GSI не найден.');
  }
}

/**
 * Проверяет наличие JWT в localStorage при загрузке страницы.
 */
function checkInitialAuthState() {
  const token = localStorage.getItem('jwtToken');
  if (token) {
    // TODO: Добавить проверку валидности и срока действия токена.
    // Можно сделать запрос на специальный эндпоинт /users/me
    state.isAuthenticated = true;
    console.log('Пользователь аутентифицирован (найден JWT).');
  } else {
    state.isAuthenticated = false;
    console.log('Пользователь не аутентифицирован.');
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