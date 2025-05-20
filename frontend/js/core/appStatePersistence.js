// frontend/js/core/appStatePersistence.js - Модуль для сохранения и загрузки состояния приложения

const PANELS_HIDDEN_STORAGE_KEY = 'panelsHidden';

/**
 * Сохраняет состояние видимости панелей в localStorage.
 * @param {boolean} isHidden - true, если панели скрыты, false, если показаны.
 */
export function savePanelState(isHidden) {
  try {
    localStorage.setItem(PANELS_HIDDEN_STORAGE_KEY, isHidden.toString());
    console.log(`Состояние панелей сохранено: ${isHidden}`);
  } catch (error) {
    console.error('Ошибка при сохранении состояния панелей в localStorage:', error);
  }
}

/**
 * Загружает состояние видимости панелей из localStorage.
 * @returns {boolean | null} true, если панели должны быть скрыты, false, если показаны, null если состояние не найдено.
 */
export function loadPanelState() {
  try {
    const savedState = localStorage.getItem(PANELS_HIDDEN_STORAGE_KEY);
    if (savedState === null) {
      console.log('Состояние панелей не найдено в localStorage.');
      return null; // Состояние не найдено
    } else {
      const isHidden = savedState === 'true';
      console.log(`Состояние панелей загружено: ${isHidden}`);
      return isHidden;
    }
  } catch (error) {
    console.error('Ошибка при загрузке состояния панелей из localStorage:', error);
    return null; // В случае ошибки возвращаем null
  }
}