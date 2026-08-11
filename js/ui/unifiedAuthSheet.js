/**
 * @file unifiedAuthSheet.js
 * @description Единая шторка входа: Google + Telegram + гость в одном окне.
 *
 * 2026-08-11. Оживляет css/_auth-sheet.css (написан, но не был подключён к DOM).
 *
 * Почему шторка своя, а не «системная плашка Google+TG»: One Tap рисуется
 * браузером через FedCM вне нашего DOM, склеить его с кнопкой Telegram в одном
 * нативном окне физически нельзя. Поэтому окно наше, а кнопка Google —
 * настоящая GIS-кнопка, отрендеренная внутрь контейнера шторки.
 *
 * Дизайн-решения (учтены концепты Gemini/Qwen v2-v3):
 *   • Glassmorphism + скрим под текстом — контраст 4.5:1 (WCAG 2.2)
 *   • Magnetic CTA: --mx/--my задаются здесь, CSS двигает кнопку
 *   • Порядок кнопок: возвратник → Google → Telegram → гость
 *   • Mobile: bottom-sheet, цели ≥44px; на тач-устройствах magnetic выключен
 *   • prefers-reduced-motion: один флаг data-reduced-motion на <html>
 *   • focus-trap + ВОЗВРАТ фокуса на элемент, с которого открыли
 */

const SHEET_ID = 'auth-sheet-backdrop';
const RETURNING_USER_KEY = 'auth:lastUser';

let activeSheet = null;
let previouslyFocused = null;
let keydownHandler = null;

/**
 * Ставит флаг движения на <html> один раз — дальше всё решает CSS.
 * Одна точка правды вместо проверок matchMedia в каждом обработчике.
 */
export function applyMotionPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.setAttribute('data-reduced-motion', String(reduced));
  return reduced;
}

function prefersReducedMotion() {
  return document.documentElement.getAttribute('data-reduced-motion') === 'true';
}

function isTouchDevice() {
  return window.matchMedia?.('(hover: none)').matches ?? false;
}

/** Запоминает вошедшего, чтобы в следующий раз предложить «Продолжить как …». */
export function rememberUser(user) {
  if (!user) return;
  try {
    localStorage.setItem(
      RETURNING_USER_KEY,
      JSON.stringify({
        name: user.first_name || user.name || user.email || '',
        email: user.email || '',
        provider: user.platform || user.provider || 'google',
      })
    );
  } catch {
    /* приватный режим — не критично, просто не будет «Продолжить как» */
  }
}

function getReturningUser() {
  try {
    const raw = localStorage.getItem(RETURNING_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && (parsed.name || parsed.email) ? parsed : null;
  } catch {
    return null;
  }
}

export function forgetUser() {
  try {
    localStorage.removeItem(RETURNING_USER_KEY);
  } catch { /* ignore */ }
}

/** Magnetic CTA: кнопка тянется к курсору. Выключается флагом и на тач. */
function attachMagnetic(button) {
  if (prefersReducedMotion() || isTouchDevice()) return;

  const onMove = (event) => {
    const rect = button.getBoundingClientRect();
    // Смещение от центра, ограничено ±6px — «притяжение», а не рывок
    const dx = ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 12;
    const dy = ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 8;
    button.style.setProperty('--mx', `${Math.max(-6, Math.min(6, dx)).toFixed(2)}px`);
    button.style.setProperty('--my', `${Math.max(-4, Math.min(4, dy)).toFixed(2)}px`);
  };

  const onLeave = () => {
    button.style.setProperty('--mx', '0px');
    button.style.setProperty('--my', '0px');
  };

  button.addEventListener('mousemove', onMove);
  button.addEventListener('mouseleave', onLeave);
}

function createButton({ variant, label, iconHTML, onClick, avatarText }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `auth-btn auth-btn--${variant}`;

  if (avatarText) {
    const avatar = document.createElement('span');
    avatar.className = 'auth-btn__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = avatarText;
    btn.appendChild(avatar);
  } else if (iconHTML) {
    const icon = document.createElement('span');
    icon.className = 'auth-btn__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = iconHTML;
    btn.appendChild(icon);
  }

  const text = document.createElement('span');
  text.textContent = label;
  btn.appendChild(text);

  btn.addEventListener('click', onClick);
  attachMagnetic(btn);
  return btn;
}

const TG_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
<path d="M21.9 4.3 18.9 19c-.2 1-.8 1.2-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.6 8.5-7.7c.4-.3-.1-.5-.6-.2L6.9 13.2 2.4 11.8c-1-.3-1-.9.2-1.4l17-6.6c.8-.3 1.5.2 1.3 1z"/></svg>`;

const GOOGLE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20">
<path fill="#4285f4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.2 3.5l3.4 2.6c2-1.8 3.4-4.5 3.4-8z"/>
<path fill="#34a853" d="M12 23c2.9 0 5.3-1 7.1-2.6l-3.4-2.6c-.9.6-2.1 1-3.7 1-2.8 0-5.2-1.9-6.1-4.4l-3.5 2.7C4.2 20.5 7.8 23 12 23z"/>
<path fill="#fbbc05" d="M5.9 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4L2.4 7C1.7 8.5 1.3 10.2 1.3 12s.4 3.5 1.1 5l3.5-2.6z"/>
<path fill="#ea4335" d="M12 5.4c2 0 3.3.8 4.1 1.6l3-2.9C17.3 2.4 14.9 1.3 12 1.3 7.8 1.3 4.2 3.8 2.4 7l3.5 2.7C6.8 7.2 9.2 5.4 12 5.4z"/></svg>`;

/**
 * Показывает шторку входа.
 *
 * @param {Object} handlers
 * @param {Function} handlers.onGoogle    — клик по Google (или рендер GIS-кнопки)
 * @param {Function} handlers.onTelegram  — клик по Telegram
 * @param {Function} handlers.onGuest     — «Продолжить гостем»
 * @param {Function} [handlers.onContinue]— «Продолжить как …» (возвратник)
 * @param {Function} [handlers.renderGis] — колбэк для google.accounts.id.renderButton
 * @param {string}   [handlers.consentHTML] — текст согласия (ссылки на политику)
 * @returns {Object} api: { close, showStatus, element }
 */
export function showAuthSheet(handlers = {}) {
  if (activeSheet) return activeSheet;

  applyMotionPreference();
  previouslyFocused = document.activeElement;

  const backdrop = document.createElement('div');
  backdrop.className = 'auth-sheet-backdrop';
  backdrop.id = SHEET_ID;

  const sheet = document.createElement('div');
  sheet.className = 'auth-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'auth-sheet-title');

  // Заголовок
  const header = document.createElement('div');
  header.className = 'auth-sheet__header';
  const title = document.createElement('h2');
  title.className = 'auth-sheet__title';
  title.id = 'auth-sheet-title';
  title.textContent = 'Быстрый вход';
  const subtitle = document.createElement('p');
  subtitle.className = 'auth-sheet__subtitle';
  subtitle.textContent = 'Чтобы сохранить голограммы и прогресс';
  header.append(title, subtitle);

  const providers = document.createElement('div');
  providers.className = 'auth-sheet__providers';

  // 1. Возвратник — один клик без FedCM
  const returning = getReturningUser();
  if (returning && handlers.onContinue) {
    const shownName = returning.name || returning.email;
    providers.appendChild(
      createButton({
        variant: 'continue',
        label: `Продолжить как ${shownName}`,
        avatarText: (shownName[0] || '?').toUpperCase(),
        onClick: () => handlers.onContinue(returning),
      })
    );
  }

  // 2. Google — настоящая GIS-кнопка, если дан рендерер
  const gisSlot = document.createElement('div');
  gisSlot.className = 'auth-sheet__gis';
  providers.appendChild(gisSlot);

  if (typeof handlers.renderGis === 'function') {
    try {
      handlers.renderGis(gisSlot);
    } catch (err) {
      console.warn('[AuthSheet] GIS render failed, using fallback button', err);
    }
  }
  // Фолбэк: если GIS не отрисовался (блокировка/таймаут в РФ) — своя кнопка
  if (!gisSlot.childElementCount && handlers.onGoogle) {
    gisSlot.appendChild(
      createButton({
        variant: 'google',
        label: 'Войти через Google',
        iconHTML: GOOGLE_ICON,
        onClick: handlers.onGoogle,
      })
    );
  }

  // 3. Telegram
  if (handlers.onTelegram) {
    providers.appendChild(
      createButton({
        variant: 'telegram',
        label: handlers.telegramLabel || 'Войти через Telegram',
        iconHTML: TG_ICON,
        onClick: handlers.onTelegram,
      })
    );
  }

  sheet.append(header, providers);

  // Статус: сюда пишем «Google недоступен — войди через Telegram»
  const status = document.createElement('div');
  status.className = 'auth-sheet__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  sheet.appendChild(status);

  // 4. Гость — намеренно тише остальных
  if (handlers.onGuest) {
    const divider = document.createElement('div');
    divider.className = 'auth-sheet__divider';
    divider.textContent = 'или';
    sheet.appendChild(divider);
    sheet.appendChild(
      createButton({
        variant: 'guest',
        label: 'Продолжить гостем',
        onClick: handlers.onGuest,
      })
    );
  }

  if (handlers.consentHTML) {
    const consent = document.createElement('div');
    consent.className = 'auth-sheet__consent';
    consent.innerHTML = handlers.consentHTML;
    sheet.appendChild(consent);
  }

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  // ─── focus-trap: Tab не убегает из шторки, Escape закрывает ───
  const focusables = () =>
    Array.from(
      sheet.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.offsetParent !== null);

  keydownHandler = (event) => {
    if (event.key === 'Escape' && handlers.onGuest) {
      event.preventDefault();
      handlers.onGuest();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', keydownHandler);

  requestAnimationFrame(() => focusables()[0]?.focus());

  const api = {
    element: backdrop,

    /** Показывает подсказку/ошибку. kind: 'fallback' | 'error' */
    showStatus(message, kind = 'fallback') {
      status.className = `auth-sheet__status auth-sheet__status--${kind} is-visible`;
      status.textContent = message;
    },

    /** Подсвечивает Telegram, когда Google не ответил. */
    highlightTelegram(message = 'Google недоступен — войди через Telegram') {
      api.showStatus(message, 'fallback');
      const tgBtn = sheet.querySelector('.auth-btn--telegram');
      tgBtn?.focus();
    },

    close() {
      if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
      }
      backdrop.remove();
      activeSheet = null;
      // Возврат фокуса туда, откуда открыли — иначе скринридер теряет место
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
      previouslyFocused = null;
    },
  };

  activeSheet = api;
  return api;
}

export function closeAuthSheet() {
  activeSheet?.close();
}

export function isAuthSheetOpen() {
  return Boolean(activeSheet);
}
