/**
 * Модуль диагностики фронтенда
 * Предоставляет функции для проверки состояния ключевых компонентов
 */

// Импортируем необходимые зависимости
import { state } from './init.js';

/**
 * Проверяет доступность глобального объекта или функции
 * @param {string} name - Имя объекта или функции
 * @returns {Object} - Результат проверки
 */
function checkGlobalObject(name) {
  const exists = typeof window[name] !== 'undefined';
  return {
    name,
    exists,
    type: exists ? typeof window[name] : 'undefined'
  };
}

/**
 * Проверяет наличие DOM-элемента
 * @param {string} id - ID элемента
 * @param {string} description - Описание элемента
 * @returns {Object} - Результат проверки
 */
function checkDOMElement(id, description) {
  const element = document.getElementById(id);
  return {
    id,
    description,
    exists: element !== null,
    visible: element ? window.getComputedStyle(element).display !== 'none' : false
  };
}

/**
 * Проверяет состояние модуля
 * @param {string} name - Имя модуля
 * @param {boolean} initialized - Флаг инициализации
 * @returns {Object} - Результат проверки
 */
function checkModuleState(name, initialized) {
  return {
    name,
    initialized: initialized === true
  };
}

/**
 * Запускает диагностику фронтенда и выводит результаты в консоль
 */
export function runFrontendDiagnostics() {
  console.group('🔍 Диагностика фронтенда');
  
  // Проверка глобальных объектов из script.js
  console.group('Глобальные объекты и функции');
  const globalObjects = [
    checkGlobalObject('loadChatHistory'),
    checkGlobalObject('hologramPivot'),
    checkGlobalObject('scene'),
    checkGlobalObject('columns'),
    checkGlobalObject('audioContext')
  ];
  
  globalObjects.forEach(obj => {
    console.log(
      `${obj.exists ? '✅' : '❌'} ${obj.name}: ${obj.exists ? obj.type : 'не найден'}`
    );
  });
  console.groupEnd();
  
  // Проверка ключевых DOM-элементов
  console.group('DOM-элементы');
  const domElements = [
    checkDOMElement('grid-container', 'Контейнер сетки'),
    checkDOMElement('camera-view', 'Вид камеры'),
    checkDOMElement('versionTimeline', 'Таймлайн версий'),
    checkDOMElement('chatHistory', 'История чата'),
    checkDOMElement('promptBar', 'Панель ввода промпта'),
    checkDOMElement('chatInputBar', 'Панель ввода чата'),
    checkDOMElement('gesture-area', 'Область жестов')
  ];
  
  domElements.forEach(el => {
    console.log(
      `${el.exists ? '✅' : '❌'} ${el.id} (${el.description}): ${el.exists ? (el.visible ? 'видимый' : 'скрытый') : 'не найден'}`
    );
  });
  console.groupEnd();
  
  // Проверка состояния из init.js
  console.group('Состояние приложения');
  try {
    if (state) {
      console.log(`✅ Объект state: инициализирован`);
      console.table({
        'Сцена': state.scene !== null,
        'Камера': state.camera !== null,
        'Рендерер': state.renderer !== null,
        'Аудио контекст': state.audioContext !== null,
        'Режим XR': state.xrMode === true
      });
    } else {
      console.log('❌ Объект state: не инициализирован');
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке state:', error.message);
  }
  console.groupEnd();
  
  // Проверка инициализации модулей
  console.group('Инициализация модулей');
  const modules = [
    checkModuleState('Ядро (init.js)', state !== undefined),
    checkModuleState('Правая панель', typeof window.getCurrentMode === 'function'),
    checkModuleState('Чат', typeof window.addMessage === 'function'),
    checkModuleState('Распознавание речи', typeof window.startSpeechRecognition === 'function')
  ];
  
  modules.forEach(module => {
    console.log(
      `${module.initialized ? '✅' : '❌'} ${module.name}: ${module.initialized ? 'инициализирован' : 'не инициализирован'}`
    );
  });
  console.groupEnd();
  
  // Информация о браузере и окружении
  console.group('Окружение');
  console.log('🌐 User Agent:', navigator.userAgent);
  console.log('📱 Размер окна:', window.innerWidth + 'x' + window.innerHeight);
  console.log('🔊 AudioContext поддерживается:', typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');
  console.log('📹 MediaDevices поддерживаются:', navigator.mediaDevices !== undefined);
  console.groupEnd();
  
  console.groupEnd(); // Закрываем основную группу диагностики
  
  return {
    timestamp: new Date().toISOString(),
    globalObjects,
    domElements,
    modules
  };
}

// Экспортируем функцию для использования в других модулях
export default {
  runFrontendDiagnostics
};