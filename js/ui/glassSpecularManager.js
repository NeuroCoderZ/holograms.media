/**
 * GlassSpecularManager.js
 * 
 * Реализует физику BasilaQ-128: 128 столбцов → 7 цветовых зон → цветные блики на стекле
 * 
 * Физика:
 * 1. Каждый столбец голограммы — источник цветного света (HSL из Semitones_Angles.md)
 * 2. Свет падает сбоку на кромку стекла (толщина 2-4px)
 * 3. Преломляется внутри → цветной блик на кромке (specular highlight)
 * 
 * Оптимизация: 128 столбцов группируются в 7 цветовых зон радуги
 */

import { semitones } from '../config/hologramConfig.js';

// 7 цветовых зон на основе HSL из Semitones_Angles.md
const COLOR_ZONES = [
  { name: 'red',    hRange: [0, 30],   elements: [], avgPanX: 0, avgAmp: 0 },
  { name: 'orange', hRange: [30, 60],  elements: [], avgPanX: 0, avgAmp: 0 },
  { name: 'yellow', hRange: [60, 90],  elements: [], avgPanX: 0, avgAmp: 0 },
  { name: 'green',  hRange: [90, 150], elements: [], avgPanX: 0, avgAmp: 0 },
  { name: 'cyan',   hRange: [150, 210], elements: [], avgPanX: 0, avgAmp: 0 },
  { name: 'blue',   hRange: [210, 270], elements: [], avgPanX: 0, avgAmp: 0 },
  { name: 'purple', hRange: [270, 360], elements: [], avgPanX: 0, avgAmp: 0 }
];

class GlassSpecularManager {
  constructor() {
    this.initialized = false;
    this.bliks = new Map(); // elementId → array of 7 blik elements
  }

  /**
   * Инициализация: находит все стеклянные элементы и создаёт для них блики
   */
  init() {
    if (this.initialized) return;

    console.log('[GlassSpecularManager] Initializing 7-zone spectral glints...');

    // Находим все панели и кнопки
    const elements = document.querySelectorAll(
      '.control-button, .panel, .panel-section, #modelSelectContainer, .right-panel-view'
    );

    elements.forEach((el, idx) => {
      const id = el.id || `glass-el-${idx}`;
      el.style.position = 'relative';
      el.style.overflow = 'hidden';

      // Контейнер для бликов
      const blikContainer = document.createElement('div');
      blikContainer.className = 'blik-container';
      blikContainer.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 2;
        mix-blend-mode: screen;
      `;

      // Создаём 7 бликов (по одному на зону)
      const bliks = [];
      COLOR_ZONES.forEach((zone) => {
        const blik = document.createElement('div');
        blik.className = `blik blik-${zone.name}`;
        blik.style.cssText = `
          position: absolute;
          width: 80px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(ellipse 80px 40px at 50% 30%, 
            ${this._getBaseColor(zone.name)} 0%, 
            transparent 70%);
          opacity: 0;
          filter: blur(6px);
          left: 50%;
          top: 10%;
          transform: translateX(-50%) scale(1);
          transition: opacity 0.08s linear, transform 0.08s linear;
        `;
        blikContainer.appendChild(blik);
        bliks.push(blik);
      });

      el.appendChild(blikContainer);
      this.bliks.set(id, { element: el, bliks });
    });

    this.initialized = true;
    console.log(`[GlassSpecularManager] ✅ Initialized ${this.bliks.size} elements with 7-zone glints`);
  }

  /**
   * Обновление бликов на основе данных столбцов
   * columnData: [{ freq, amplitude: 0..1, color: 'hsl(...)', panX: -1..1 }]
   */
  update(columnData) {
    if (!this.initialized || columnData.length === 0) {
      this._clearAllBliks();
      return;
    }

    // Сбрасываем накопления
    COLOR_ZONES.forEach(zone => {
      zone.elements = [];
      zone.avgPanX = 0;
      zone.avgAmp = 0;
    });

    // Распределяем столбцы по зонам
    columnData.forEach(col => {
      const h = this._extractHue(col.color);
      const zone = COLOR_ZONES.find(z => h >= z.hRange[0] && h < z.hRange[1]);
      
      if (zone) {
        zone.elements.push(col);
      }
    });

    // Вычисляем средние для каждой зоны
    COLOR_ZONES.forEach(zone => {
      if (zone.elements.length > 0) {
        zone.avgAmp = zone.elements.reduce((sum, c) => sum + c.amplitude, 0) / zone.elements.length;
        zone.avgPanX = zone.elements.reduce((sum, c) => sum + c.panX, 0) / zone.elements.length;
      }
    });

    // Обновляем блики на всех элементах
    this.bliks.forEach(({ element, bliks }) => {
      const rect = element.getBoundingClientRect();
      const elCenterX = (rect.left + rect.width / 2) / window.innerWidth;

      bliks.forEach((blik, zoneIdx) => {
        const zone = COLOR_ZONES[zoneIdx];
        
        if (zone.elements.length === 0 || zone.avgAmp < 0.05) {
          blik.style.opacity = '0';
          return;
        }

        // Позиция блика: panX (-1..1) → проценты внутри элемента
        // panX = -1 (слева) → 0%, panX = 1 (справа) → 100%
        const blikPositionX = ((zone.avgPanX + 1) / 2) * 100;
        
        // Яркость от амплитуды (макс 0.85)
        const opacity = Math.min(0.85, zone.avgAmp * 1.2);
        
        // Масштаб от амплитуды (пульсация)
        const scale = 1 + zone.avgAmp * 0.4;

        blik.style.left = `${blikPositionX}%`;
        blik.style.opacity = opacity;
        blik.style.transform = `translateX(-50%) scale(${scale})`;
      });
    });
  }

  /**
   * Получить базовый цвет для зоны
   */
  _getBaseColor(zoneName) {
    const colors = {
      red:    'hsl(0, 100%, 50%)',
      orange: 'hsl(30, 100%, 50%)',
      yellow: 'hsl(60, 100%, 50%)',
      green:  'hsl(120, 100%, 50%)',
      cyan:   'hsl(180, 100%, 50%)',
      blue:   'hsl(240, 100%, 50%)',
      purple: 'hsl(300, 100%, 50%)'
    };
    return colors[zoneName] || 'hsl(0, 0%, 50%)';
  }

  /**
   * Извлечь Hue из 'hsl(h, s%, l%)'
   */
  _extractHue(hslStr) {
    const match = hslStr.match(/hsl\(\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Очистить все блики (тишина)
   */
  _clearAllBliks() {
    this.bliks.forEach(({ bliks }) => {
      bliks.forEach(blik => blik.style.opacity = '0');
    });
  }
}

export const glassSpecularManager = new GlassSpecularManager();
export default glassSpecularManager;
