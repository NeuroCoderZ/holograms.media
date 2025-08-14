// frontend/js/utils/fullscreen.js - Управление полноэкранным режимом

// Removed: import { ui } from '../core/ui.js';

// Переключение полноэкранного режима
export function toggleFullscreen(buttonElement) {
  if (!document.fullscreenElement) {
    enterFullscreen(buttonElement);
  } else {
    exitFullscreen(buttonElement);
  }
}

// Вход в полноэкранный режим
export function enterFullscreen(buttonElement) {
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
  
  // Обновляем класс кнопки - теперь через handleFullscreenChange listener
  // if (buttonElement) {
  //   buttonElement.classList.add('active');
  // }
}

// Выход из полноэкранного режима
export function exitFullscreen(buttonElement) {
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
  
  // Обновляем класс кнопки - теперь через handleFullscreenChange listener
  // if (buttonElement) {
  //   buttonElement.classList.remove('active');
  // }
}

// Обработчик события изменения полноэкранного режима
export function initFullscreenListeners(buttonElement) {
  const handler = () => handleFullscreenChange(buttonElement);
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('mozfullscreenchange', handler);
  document.addEventListener('MSFullscreenChange', handler);
}

// Обработчик изменения полноэкранного режима
function handleFullscreenChange(buttonElement) {
  const isFullscreen = !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.mozFullScreenElement || !!document.msFullscreenElement;
  
  // Обновляем класс кнопки
  if (buttonElement) {
    buttonElement.classList.toggle('active', isFullscreen);
  }
  
  // Можно добавить дополнительную логику при изменении режима
  console.log(`Полноэкранный режим ${isFullscreen ? 'включен' : 'выключен'}`);
}