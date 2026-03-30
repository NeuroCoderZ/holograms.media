/**
 * UIContextManager.js — Глаза Триа (v0.20.258)
 * Синглтон, собирающий снапшот состояния UI для инъекции в промпт-поток.
 */

import { state } from './init.js';
import { getCurrentMode } from '../panels/rightPanelManager.js';

class UIContextManager {
  constructor() {
    this._leftPanel = null;
    this._rightPanel = null;
  }

  _getPanelElements() {
    if (!this._leftPanel) {
      this._leftPanel = document.querySelector('.left-panel') || document.getElementById('leftPanel');
      this._rightPanel = document.querySelector('.right-panel') || document.getElementById('rightPanel');
    }
  }

  getSnapshot() {
    this._getPanelElements();

    const activeTab = getCurrentMode();
    const panelsHidden = localStorage.getItem('panelsHidden') === 'true';

    let leftVisible = !panelsHidden;
    let rightVisible = !panelsHidden;

    if (this._leftPanel) {
      leftVisible = this._leftPanel.classList.contains('visible') || !this._leftPanel.classList.contains('hidden');
    }
    if (this._rightPanel) {
      rightVisible = this._rightPanel.classList.contains('visible') || !this._rightPanel.classList.contains('hidden');
    }

    const isAudioPlaying = state.audio && (
      state.audio.isPlaying ||
      state.audio.activeSource === 'microphone' ||
      state.audio.activeSource === 'tria_voice'
    );

    return {
      activeTab: activeTab,
      panels: {
        left: leftVisible ? 'visible' : 'hidden',
        right: rightVisible ? 'visible' : 'hidden',
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      hologram: {
        preset: 'spectral_bars',
        isAudioPlaying: !!isAudioPlaying,
        isPaused: !!state.audio?.isPaused,
      },
    };
  }

  /**
   * Формирует строку контекста для промпта.
   * Используется как скрытый системный префикс.
   */
  formatForPrompt() {
    const snap = this.getSnapshot();
    return `[UI Context: tab=${snap.activeTab}, panels L=${snap.panels.left}/R=${snap.panels.right}, audio=${snap.hologram.isAudioPlaying ? 'playing' : 'stopped/paused'}]`;
  }
}

const uiContextManager = new UIContextManager();
export default uiContextManager;
