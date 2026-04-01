/**
 * UIContextManager.js — Глаза и Уши Триа v2.0 (v0.20.281)
 *
 * Ультимативный синглтон-наблюдатель за всем состоянием фронтенда.
 * Собирает полный снапшот UI/UX в реальном времени и инжектирует
 * его в каждый запрос к Триа. Без этого Триа работает вслепую.
 *
 * Охватывает:
 *  - Аудио (источник, воспроизведение, пауза, уровень)
 *  - Голограмма (масштаб, активность BasilaQ, WASM статус)
 *  - Жесты (запись активна, кол-во сохранённых, последний жест)
 *  - Правая панель (активная вкладка, что видит пользователь)
 *  - Боковые панели (видны/скрыты)
 *  - Авторизация (авторизован ли пользователь)
 *  - Сеть (WebSocket статусы)
 *  - Производительность (FPS, devicePixelRatio)
 *  - XR режим
 */

import { state } from './init.js';

// Безопасный импорт rightPanelManager (может не быть на старте)
let _getCurrentMode = () => 'chat';
try {
  const mod = await import('../panels/rightPanelManager.js').catch(() => null);
  if (mod?.getCurrentMode) _getCurrentMode = mod.getCurrentMode;
} catch (_) {}

class UIContextManager {
  constructor() {
    this._leftPanel  = null;
    this._rightPanel = null;
    this._lastFps    = 60;
    this._frameCount = 0;
    this._lastFpsTime = performance.now();

    // Отслеживаем FPS через rAF для постоянной актуальности
    this._trackFps();
  }

  // ─── FPS трекер ────────────────────────────────────────────────
  _trackFps() {
    const tick = (now) => {
      this._frameCount++;
      if (now - this._lastFpsTime >= 1000) {
        this._lastFps = this._frameCount;
        this._frameCount = 0;
        this._lastFpsTime = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ─── Панели DOM ────────────────────────────────────────────────
  _getPanels() {
    if (!this._leftPanel) {
      this._leftPanel  = document.querySelector('.left-panel, #left-panel');
      this._rightPanel = document.querySelector('.right-panel, #right-panel');
    }
    return { left: this._leftPanel, right: this._rightPanel };
  }

  // ─── Аудио состояние ───────────────────────────────────────────
  _getAudioContext() {
    const audio = state.audio || {};
    const src   = audio.activeSource || 'none';
    return {
      source:    src,                                  // 'file' | 'microphone' | 'tria_voice' | 'none'
      isPlaying: !!audio.isPlaying,
      isPaused:  !!audio.isPaused,
      isActive:  src !== 'none' && (audio.isPlaying || audio.isPaused),
      wasmReady: !!(window._wasmEngineReady),          // флаг из AudioService
      pipelineOk: !!(window._cwtLinked && window._cqtConnected !== false),
      targetFps: state.performance?.screenFps || this._lastFps,
    };
  }

  // ─── BasilaQ / Голограмма ──────────────────────────────────────
  _getHologramContext() {
    const renderer = state.hologramRendererInstance;
    const gc = document.getElementById('grid-container');
    const gcRect = gc ? gc.getBoundingClientRect() : null;

    // Последние SpectralData уровни (если есть) для диагностики
    const latestAudio = state.audio?.latestAudioData;
    let signalRange = null;
    if (latestAudio?.levels) {
      const lvls = latestAudio.levels;
      let min = 0, max = -128;
      for (let i = 0; i < 128; i++) {
        if (lvls[i] > max) max = lvls[i];
        if (lvls[i] < min) min = lvls[i];
      }
      signalRange = { minDb: Math.round(min), maxDb: Math.round(max) };
    }

    return {
      hasRenderer:  !!renderer,
      frozenFrame:  !!(renderer?._frozenFrame),
      greetingMode: !state.audio?.isPlaying && !state.audio?.isPaused,
      containerPx:  gcRect ? { w: Math.round(gcRect.width), h: Math.round(gcRect.height) } : null,
      signal:       signalRange,   // { minDb, maxDb } или null
    };
  }

  // ─── Жесты ─────────────────────────────────────────────────────
  _getGestureContext() {
    const gs  = state.gestureState || {};
    const gls = window._gestureLiveStudio; // если экспортирован в глобал
    return {
      isRecording:    !!gs.isRecording,
      handsDetected:  !!(state.multimodal?.handsPresent),
      handCount:      state.multimodal?.handCount || 0,
      savedLocally:   gs.savedGestureCount || 0,
      lastGestureId:  gs.lastGestureId || null,
      studioMode:     gls?.mode || 'idle',   // 'record' | 'edit' | 'idle'
      panelPinned:    !!(gls?.isPinned),
    };
  }

  // ─── Авторизация ───────────────────────────────────────────────
  _getAuthContext() {
    return {
      isAuthenticated: !!(state.isAuthenticated || state.user),
      userId: state.user?.sub || state.user?.id || null,
      role:   state.user?.role || 'guest',
    };
  }

  // ─── Сеть ──────────────────────────────────────────────────────
  _getNetworkContext() {
    return {
      gestureWS: this._wsState('GestureIntentClient'),
      netGlyphWS: this._wsState('NetHoloGlyphClient'),
      backendUrl: import.meta.env?.VITE_API_URL || 'unknown',
    };
  }
  _wsState(name) {
    // Обращаемся к глобальным статусам если доступны
    const ws = window[`_ws_${name}`];
    if (!ws) return 'unknown';
    const states = { 0: 'connecting', 1: 'open', 2: 'closing', 3: 'closed' };
    return states[ws.readyState] || 'unknown';
  }

  // ─── XR ────────────────────────────────────────────────────────
  _getXRContext() {
    return {
      isXRMode: !!(state.isXRMode),
      xrSessionType: state.xrSessionType || null,
    };
  }

  // ─── Производительность ───────────────────────────────────────
  _getPerfContext() {
    return {
      fps:   this._lastFps,
      dpr:   window.devicePixelRatio || 1,
      vw:    window.innerWidth,
      vh:    window.innerHeight,
      touch: navigator.maxTouchPoints > 0,
    };
  }

  // ─── Панели UI ─────────────────────────────────────────────────
  _getPanelContext() {
    const { left, right } = this._getPanels();
    const leftVis  = left  ? left.classList.contains('visible')  : true;
    const rightVis = right ? right.classList.contains('visible') : true;

    // Активная вкладка правой панели
    let activeTab = 'chat';
    try { activeTab = _getCurrentMode() || 'chat'; } catch (_) {}

    // Активный контент вкладки
    const tabEl = document.querySelector('.rp-tab.active');
    const tabLabel = tabEl?.textContent?.trim().toLowerCase() || activeTab;

    return {
      leftPanel:  leftVis ? 'visible' : 'hidden',
      rightPanel: rightVis ? 'visible' : 'hidden',
      activeTab:  tabLabel,
      chatVisible: tabLabel === 'чат' || tabLabel === 'chat',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ГЛАВНЫЙ МЕТОД — полный снапшот для инъекции в промпт
  // ═══════════════════════════════════════════════════════════════
  getSnapshot() {
    return {
      timestamp:  Date.now(),
      panels:     this._getPanelContext(),
      audio:      this._getAudioContext(),
      hologram:   this._getHologramContext(),
      gestures:   this._getGestureContext(),
      auth:       this._getAuthContext(),
      network:    this._getNetworkContext(),
      xr:         this._getXRContext(),
      perf:       this._getPerfContext(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ФОРМАТИРОВАНИЕ ДЛЯ SYSTEM PROMPT
  //  Краткий, информативный текст — не перегружает токены
  // ═══════════════════════════════════════════════════════════════
  formatForPrompt() {
    const s = this.getSnapshot();
    const a = s.audio;
    const h = s.hologram;
    const g = s.gestures;
    const p = s.panels;
    const perf = s.perf;

    const audioStr = a.isActive
      ? `${a.source} ${a.isPlaying ? '▶' : '⏸'} | WASM:${a.wasmReady ? '✓' : '✗'} pipeline:${a.pipelineOk ? '✓' : '✗'}`
      : 'нет аудио';

    const signalStr = h.signal
      ? `signal:[${h.signal.minDb}..${h.signal.maxDb}dB]`
      : 'нет данных';

    const gestureStr = g.isRecording
      ? `⏺ запись (рук: ${g.handCount})`
      : g.handsDetected ? `рук: ${g.handCount}` : 'руки не видны';

    return [
      `[UI v2 @ ${perf.vw}×${perf.vh} | FPS:${perf.fps} | tab:${p.activeTab}]`,
      `[панели: L=${p.leftPanel} R=${p.rightPanel}]`,
      `[аудио: ${audioStr}]`,
      `[голограмма: BasilaQ ${signalStr} | frozen:${h.frozenFrame}]`,
      `[жесты: ${gestureStr} | сохранено:${g.savedLocally}]`,
      `[auth: ${s.auth.isAuthenticated ? `✓ ${s.auth.role}` : 'гость'}]`,
      `[xr: ${s.xr.isXRMode ? '✓ ' + s.xr.xrSessionType : 'off'}]`,
    ].join('\n');
  }

  // ─── Лог для отладки (вызвать из консоли) ─────────────────────
  debug() {
    console.group('[UIContextManager] Полный снапшот');
    console.log(this.getSnapshot());
    console.log('--- Для промпта ---');
    console.log(this.formatForPrompt());
    console.groupEnd();
  }
}

const uiContextManager = new UIContextManager();

// Глобальный доступ для отладки (window.triaEyes.debug())
window.triaEyes = uiContextManager;

export default uiContextManager;
