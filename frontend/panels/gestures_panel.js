// gestures_panel.js - Модуль для управления панелью Жесты

// Переменные для хранения жестов пользователя
let userGestures = [];

// Экспортируем функцию для инициализации панели Жесты
export function initGesturesPanel() {
  console.log("Инициализация панели Жесты");
  
  // Создаем контейнер для жестов, если его еще нет
  let gesturesContainer = document.getElementById('gesturesPanel');
  
  if (!gesturesContainer) {
    // Создаем контейнер панели жестов
    gesturesContainer = document.createElement('div');
    gesturesContainer.id = 'gesturesPanel';
    gesturesContainer.className = 'panel-content';
    gesturesContainer.style.display = 'none'; // По умолчанию скрыт
    
    // Создаем заголовок панели
    const gesturesPanelHeader = document.createElement('div');
    gesturesPanelHeader.className = 'panel-header';
    gesturesPanelHeader.textContent = 'Ваши жесты';
    
    // Создаем список жестов
    const gesturesList = document.createElement('div');
    gesturesList.id = 'gesturesList';
    gesturesList.className = 'gestures-list';
    
    // Создаем кнопку для записи нового жеста
    const newGestureButton = document.createElement('button');
    newGestureButton.id = 'newGestureButton';
    newGestureButton.className = 'new-gesture-button';
    newGestureButton.textContent = 'Записать новый жест';
    
    // Обработчик клика по кнопке "Записать новый жест"
    newGestureButton.addEventListener('click', () => {
      // Открываем модальное окно для записи жеста
      const gestureModal = document.getElementById('gestureModal');
      if (gestureModal) {
        gestureModal.classList.add('active');
      }
    });
    
    // Собираем структуру
    gesturesContainer.appendChild(gesturesPanelHeader);
    gesturesContainer.appendChild(gesturesList);
    gesturesContainer.appendChild(newGestureButton);
    
    // Добавляем контейнер в правую панель
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
      rightPanel.appendChild(gesturesContainer);
    } else {
      console.error("Элемент .right-panel не найден!");
    }
  }
  
  // Загружаем жесты пользователя
  loadUserGestures();
}

// Функция для отображения панели жестов
export function showGesturesPanel() {
  const timelineContainer = document.getElementById('versionTimeline');
  const chatContainer = document.getElementById('chatPanel');
  const gesturesContainer = document.getElementById('gesturesPanel');
  const hologramsContainer = document.getElementById('hologramsPanel');
  
  // Показываем жесты, скрываем остальные панели
  if (timelineContainer) timelineContainer.style.display = 'none';
  if (chatContainer) chatContainer.style.display = 'none';
  if (gesturesContainer) gesturesContainer.style.display = 'block';
  if (hologramsContainer) hologramsContainer.style.display = 'none';
  
  // Активируем соответствующую кнопку в навигации режимов
  setActivePanelButton('gesturesButton');
}

// Функция для загрузки жестов пользователя
async function loadUserGestures() {
  try {
    // Попытка загрузить жесты из локального хранилища
    const storedGestures = localStorage.getItem('userGestures');
    if (storedGestures) {
      userGestures = JSON.parse(storedGestures);
    } else {
      // Если в локальном хранилище нет, загружаем с сервера
      const response = await fetch('/api/gestures');
      if (response.ok) {
        const data = await response.json();
        userGestures = data.gestures || [];
        // Сохраняем в localStorage для последующего использования
        localStorage.setItem('userGestures', JSON.stringify(userGestures));
      }
    }
    
    // Отображаем жесты в интерфейсе
    renderGesturesList();
  } catch (error) {
    console.error('Ошибка при загрузке жестов:', error);
  }
}

// Функция для сохранения жеста
export async function saveGesture(gestureData, name = 'Новый жест') {
  try {
    // Создаем новый объект жеста
    const newGesture = {
      id: Date.now().toString(),
      name,
      data: gestureData,
      createdAt: new Date().toISOString()
    };
    
    // Добавляем в список жестов
    userGestures.push(newGesture);
    
    // Сохраняем в localStorage
    localStorage.setItem('userGestures', JSON.stringify(userGestures));
    
    // Отправляем на сервер
    await fetch('/api/gestures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newGesture)
    });
    
    // Обновляем UI
    renderGesturesList();
    
    return newGesture.id;
  } catch (error) {
    console.error('Ошибка при сохранении жеста:', error);
    return null;
  }
}

// Функция для удаления жеста
export async function deleteGesture(gestureId) {
  try {
    // Удаляем из локального списка
    userGestures = userGestures.filter(gesture => gesture.id !== gestureId);
    
    // Обновляем localStorage
    localStorage.setItem('userGestures', JSON.stringify(userGestures));
    
    // Отправляем запрос на удаление на сервер
    await fetch(`/api/gestures/${gestureId}`, {
      method: 'DELETE'
    });
    
    // Обновляем UI
    renderGesturesList();
    
    return true;
  } catch (error) {
    console.error('Ошибка при удалении жеста:', error);
    return false;
  }
}

// Функция для отрисовки списка жестов
function renderGesturesList() {
  const gesturesList = document.getElementById('gesturesList');
  if (!gesturesList) return;
  
  // Очищаем список
  gesturesList.innerHTML = '';
  
  if (userGestures.length === 0) {
    const noGesturesMessage = document.createElement('div');
    noGesturesMessage.className = 'no-gestures-message';
    noGesturesMessage.textContent = 'У вас пока нет сохраненных жестов.';
    gesturesList.appendChild(noGesturesMessage);
    return;
  }
  
  // Добавляем элементы жестов
  userGestures.forEach(gesture => {
    const gestureElement = createGestureElement(gesture);
    gesturesList.appendChild(gestureElement);
  });
}

// Вспомогательная функция для создания элемента жеста
function createGestureElement(gesture) {
  const gestureElement = document.createElement('div');
  gestureElement.className = 'gesture-item';
  gestureElement.dataset.gestureId = gesture.id;
  
  const gestureName = document.createElement('div');
  gestureName.className = 'gesture-name';
  gestureName.textContent = gesture.name;
  
  const gestureDate = document.createElement('div');
  gestureDate.className = 'gesture-date';
  gestureDate.textContent = new Date(gesture.createdAt).toLocaleDateString();
  
  const gestureActions = document.createElement('div');
  gestureActions.className = 'gesture-actions';
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-gesture-button';
  deleteButton.textContent = 'Удалить';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Вы уверены, что хотите удалить этот жест?')) {
      deleteGesture(gesture.id);
    }
  });
  
  gestureActions.appendChild(deleteButton);
  gestureElement.appendChild(gestureName);
  gestureElement.appendChild(gestureDate);
  gestureElement.appendChild(gestureActions);
  
  // Добавляем обработчик клика для выбора жеста
  gestureElement.addEventListener('click', () => {
    // Выделяем выбранный жест
    document.querySelectorAll('.gesture-item').forEach(item => {
      item.classList.remove('selected');
    });
    gestureElement.classList.add('selected');
    
    // Вызываем функцию для применения жеста
    selectGesture(gesture.id);
  });
  
  return gestureElement;
}

// Функция для выбора жеста
function selectGesture(gestureId) {
  const selectedGesture = userGestures.find(gesture => gesture.id === gestureId);
  if (selectedGesture) {
    console.log(`Выбран жест: ${selectedGesture.name}`);
    // Здесь можно добавить логику для применения жеста к голограмме
  }
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