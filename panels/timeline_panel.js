// timeline_panel.js - Модуль для управления панелью Таймлайн

// Экспортируем функцию для инициализации панели Таймлайн
export function initTimelinePanel() {
  console.log("Инициализация панели Таймлайн");
  
  // Получаем ссылку на контейнер таймлайна
  const timelineContainer = document.getElementById('versionTimeline');
  
  // Убеждаемся, что контейнер существует
  if (!timelineContainer) {
    console.error("Элемент #versionTimeline не найден!");
    return;
  }
  
  // Инициализируем видимость таймлайна
  timelineContainer.style.display = 'block';
  
  // Другая инициализация...
}

// Функция для отображения панели
export function showTimelinePanel() {
  const timelineContainer = document.getElementById('versionTimeline');
  const chatContainer = document.getElementById('chatPanel');
  const gesturesContainer = document.getElementById('gesturesPanel');
  const hologramsContainer = document.getElementById('hologramsPanel');
  
  // Показываем таймлайн, скрываем остальные панели
  if (timelineContainer) timelineContainer.style.display = 'block';
  if (chatContainer) chatContainer.style.display = 'none';
  if (gesturesContainer) gesturesContainer.style.display = 'none';
  if (hologramsContainer) hologramsContainer.style.display = 'none';
  
  // Активируем соответствующую кнопку в навигации режимов
  setActivePanelButton('timelineButton');
}

// Экспортируем функцию для обновления таймлайна с сервера
export async function updateTimelineFromServer() {
  try {
    const response = await fetch('/api/timeline');
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    renderTimelineItems(data.versions);
    return data;
  } catch (error) {
    console.error('Ошибка при получении данных таймлайна:', error);
    return null;
  }
}

// Функция для отрисовки элементов таймлайна
function renderTimelineItems(versions) {
  const framesContainer = document.getElementById('versionFrames');
  if (!framesContainer) return;
  
  // Очищаем контейнер
  framesContainer.innerHTML = '';
  
  // Добавляем элементы версий
  versions.forEach(version => {
    const versionElement = createVersionElement(version);
    framesContainer.appendChild(versionElement);
  });
}

// Вспомогательная функция для создания элемента версии
function createVersionElement(version) {
  const versionFrame = document.createElement('div');
  versionFrame.className = 'version-frame';
  versionFrame.dataset.versionId = version.id;
  
  const versionLabel = document.createElement('div');
  versionLabel.className = 'version-label';
  versionLabel.textContent = version.name || `Версия ${version.id}`;
  
  const versionText = document.createElement('div');
  versionText.className = 'version-text';
  
  const textParagraph = document.createElement('p');
  textParagraph.textContent = version.description || 'Нет описания';
  
  versionText.appendChild(textParagraph);
  versionFrame.appendChild(versionLabel);
  versionFrame.appendChild(versionText);
  
  // Добавляем обработчик события для переключения версии
  versionFrame.addEventListener('click', () => {
    switchToVersion(version.id, version.branch || 'main');
  });
  
  return versionFrame;
}

// Вспомогательная функция для установки активной кнопки панели
function setActivePanelButton(buttonId) {
  // Сначала убираем класс active со всех кнопок панелей
  const panelButtons = document.querySelectorAll('.panel-mode-button');
  panelButtons.forEach(button => button.classList.remove('active'));
  
  // Затем добавляем класс active нужной кнопке
  const activeButton = document.getElementById(buttonId);
  if (activeButton) activeButton.classList.add('active');
}

// Функция для переключения на версию (заглушка, реальная функция будет в основном файле)
async function switchToVersion(versionId, branch) {
  console.log(`Переключение на версию ${versionId} в ветке ${branch}`);
  // В реальном коде здесь будет вызов фактической функции из основного файла
} 