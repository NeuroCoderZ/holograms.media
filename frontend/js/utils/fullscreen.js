// frontend/js/utils/fullscreen.js - Управление полноэкранным режимом

import { ui } from '../core/ui.js';

// Переключение полноэкранного режима
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    enterFullscreen();
  } else {
    exitFullscreen();
  }
}

// Вход в полноэкранный режим
export function enterFullscreen() {
  // Определение элемента для полноэкранного режима
  const element = document.documentElement;
  
  if (element.requestFullscreen) {
    element.requestFullscreen().catch(err => {
      console.error(`Ошибка перехода в полноэкранный режим: ${err.message}`);
    });
  } else if (element.mozRequestFullScreen) { // Firefox
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) { // Chrome, Safari и Opera
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) { // IE/Edge
    element.msRequestFullscreen();
  }
  
  // Обновляем класс кнопки
  if (ui.buttons.fullscreenButton) {
    ui.buttons.fullscreenButton.classList.add('active');
  }
}

// Выход из полноэкранного режима
export function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen().catch(err => {
      console.error(`Ошибка выхода из полноэкранного режима: ${err.message}`);
    });
  } else if (document.mozCancelFullScreen) { // Firefox
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) { // Chrome, Safari и Opera
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) { // IE/Edge
    document.msExitFullscreen();
  }
  
  // Обновляем класс кнопки
  if (ui.buttons.fullscreenButton) {
    ui.buttons.fullscreenButton.classList.remove('active');
  }
}

// Обработчик события изменения полноэкранного режима
export function initFullscreenListeners() {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

// Обработчик изменения полноэкранного режима
function handleFullscreenChange() {
  const isFullscreen = !!document.fullscreenElement;
  
  // Обновляем класс кнопки
  if (ui.buttons.fullscreenButton) {
    ui.buttons.fullscreenButton.classList.toggle('active', isFullscreen);
  }
  
  // Можно добавить дополнительную логику при изменении режима
  console.log(`Полноэкранный режим ${isFullscreen ? 'включен' : 'выключен'}`);
} 