# Функция 2: Кнопка "Чат", Переключение Панелей и Функциональность Чата

## 1. Эволюция и Лучшая Историческая Реализация

### Ход мыслей/анализ:
Функциональность чата и управления правой боковой панелью (переключение между таймлайном версий и интерфейсом чата) была заложена в `script.js.txt`. Хотя непосредственный обработчик клика по кнопке чата (`#chatButton`) был закомментирован с указанием, что логика перенесена в `rightPanelManager.js` (который не был доступен для анализа), остальная часть `script.js.txt` содержит ключевые элементы для работы самого чата.

Основные аспекты из `script.js.txt`:
-   **Идентификация элементов UI чата:** `#chatInput` (для ввода текста), `#submitChatMessage` (кнопка отправки), `#chatMessages` (контейнер для сообщений), `#modelSelect` (для выбора LLM).
-   **Отправка сообщений:** Функция `sendChatMessage` формирует запрос к бэкенду (`/chat`), включая текст сообщения, выбранную модель и историю последних 10 сообщений (взятых из DOM).
-   **Отображение сообщений:** Используется функция `addMessage` (импортированная из `/static/js/panels/chatMessages.js`) для добавления сообщений пользователя и ИИ в `#chatMessages`. Также есть функция `speak` для озвучивания ответа ИИ.
-   **История чата:**
    -   Клиентская сторона: `localStorage.getItem('current_chat_id')` для получения ID текущего чата. При отправке сообщения, история для контекста собирается из последних 10 сообщений в DOM.
    -   Серверная сторона: Функция `loadChatHistory` делает GET-запрос к `/chat/history/${chatId}` для загрузки истории, что предполагает хранение истории на сервере (вероятно, в MongoDB, как указано в `PROMPT.txt`).
-   **Управление состоянием UI (Timeline vs. Chat):** В `script.js.txt` нет явного кода, управляющего переключением видимости между таймлайном и чатом в правой панели. Эта логика была делегирована `rightPanelManager.js`. Предполагается, что `rightPanelManager.js` изменял бы `display` CSS-свойства контейнеров таймлайна и чата.
-   **Основное поле ввода промпта (`#topPromptInput`):** `script.js.txt` не показывает, как это поле скрывалось или заменялось при переходе в режим чата. Это также, вероятно, управлялось бы извне (`rightPanelManager.js` или через CSS классы, управляемые им).

Лучшей реализацией является та, что описана в `script.js.txt`, так как она включает полнофункциональный чат с историей и выбором модели, хоть и с зависимостью от внешних модулей для управления UI панелей.

### Описание финальной логики и алгоритмов:

1.  **Инициализация (предполагаемая, часть в `rightPanelManager.js`):**
    *   Привязка обработчика события к `#chatButton`.
    *   Изначально может отображаться панель таймлайна версий.

2.  **Переключение на Режим Чата (логика в `rightPanelManager.js`):**
    *   По клику на `#chatButton`:
        *   Скрыть контейнер таймлайна версий (например, `#versionTimeline` или `#versionFrames`).
        *   Показать контейнер интерфейса чата (например, `#chatInterfaceContainer`, содержащий `#chatMessages`, `#chatInput`, `#submitChatMessage`).
        *   Возможно, скрыть или изменить основное поле ввода промпта (`#topPromptInput`).
        *   Загрузить историю чата, вызвав `loadChatHistory()`.
        *   Изменить состояние (например, CSS-класс на родительском элементе правой панели) для отражения режима "Чат".

3.  **Отправка Сообщения (`sendChatMessage` в `script.js.txt`):**
    *   Срабатывает по клику на `#submitChatMessage` или Enter в `#chatInput`.
    *   Блокировка повторной отправки (`isWaitingForResponse = true`, `submitChatMessage.disabled = true`).
    *   Отображение индикатора загрузки (`#loadingIndicator`).
    *   Получение текста из `#chatInput` и модели из `#modelSelect`.
    *   Вызов `addMessage('user', messageText)` для немедленного отображения сообщения пользователя.
    *   Сбор последних 10 сообщений из `#chatMessages` для `chatHistory`.
    *   POST-запрос на `/chat` с `{ message, model, history }` через `axios`.
    *   При получении ответа:
        *   Скрытие индикатора загрузки.
        *   Вызов `addMessage('tria', response.data.response)` для отображения ответа ИИ.
        *   Вызов `speak(response.data.response)` для озвучивания.
        *   Разблокировка отправки (`isWaitingForResponse = false`, `submitChatMessage.disabled = false`).
    *   При ошибке: отображение сообщения об ошибке, разблокировка.

4.  **Загрузка Истории Чата (`loadChatHistory` в `script.js.txt`):**
    *   Получение `chatId` из `localStorage.getItem('current_chat_id')`.
    *   Если `chatId` есть:
        *   GET-запрос на `/chat/history/${chatId}`.
        *   Очистка `#chatMessages.innerHTML`.
        *   Для каждого сообщения из истории: вызов `addMessage(sender, content)`.

5.  **Отображение Сообщений (логика в `chatMessages.js` через `addMessage`):**
    *   Функция `addMessage(sender, text)` создает новый DOM-элемент для сообщения (например, `div.chat-message.user-message` или `div.chat-message.tria-message`).
    *   Устанавливает текстовое содержимое.
    *   Добавляет элемент в контейнер `#chatMessages`.
    *   Прокручивает `#chatMessages` вниз, чтобы показать новое сообщение.

### Ключевые фрагменты кода из архивов (`script.js`):

*   **Импорт зависимостей для чата:**
    ```javascript
    // Импорт менеджеров UI и ввода
    import { initializeRightPanel } from '/static/js/panels/rightPanelManager.js';
    import { initializeChatDisplay, addMessage, clearChat, speak } from '/static/js/panels/chatMessages.js';
    ```

*   **Обработчики для элементов чата:**
    ```javascript
    const submitChatMessage = document.getElementById('submitChatMessage');
    if (submitChatMessage) {
      submitChatMessage.addEventListener('click', sendChatMessage);
    }

    const chatInputField = document.getElementById('chatInput');
    if (chatInputField) {
      chatInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
          e.preventDefault();
          sendChatMessage();
        }
      });
    }
    ```

*   **Функция `sendChatMessage` (ключевые моменты):**
    ```javascript
    function sendChatMessage() {
      // ... guard: if isWaitingForResponse, return ...
      const chatInput = document.getElementById('chatInput');
      const messageText = chatInput.value.trim();
      const modelSelect = document.getElementById('modelSelect');
      const selectedModel = modelSelect.value;

      if (messageText) {
        // ... isWaitingForResponse = true; submitChatMessage.disabled = true; ...
        addMessage('user', messageText); // Local display
        chatInput.value = '';

        const chatHistory = []; // Collect from DOM: last 10 #chatMessages .chat-message
        // ...

        axios.post('/chat', { message: messageText, model: selectedModel, history: chatHistory })
          .then(response => {
            if (response.data && response.data.response) {
              addMessage('tria', response.data.response); // Display AI response
              speak(response.data.response);
            }
            // ... isWaitingForResponse = false; submitChatMessage.disabled = false; ...
          })
          .catch(error => { /* ... handle error ... */ });
      }
    }
    ```

*   **Функция `loadChatHistory`:**
    ```javascript
    function loadChatHistory() {
      const chatId = localStorage.getItem('current_chat_id');
      if (!chatId) { /* ... */ return; }

      // ... spinner.style.display = 'block'; ...
      axios.get(`/chat/history/${chatId}`)
        .then(response => {
          // ... spinner.style.display = 'none'; ...
          const messages = response.data.messages || [];
          const chatMessagesContainer = document.getElementById('chatMessages');
          if (chatMessagesContainer) chatMessagesContainer.innerHTML = ''; // Clear current

          messages.forEach(msg => {
            const sender = msg.role === 'assistant' ? 'tria' : 'user';
            addMessage(sender, msg.content); // Uses imported addMessage
          });
        })
        .catch(error => { /* ... handle error ... */ });
    }
    ```

## 2. План Интеграции в Текущую Архитектуру

*(Примечание: План основан на предполагаемой структуре, так как актуальные файлы архитектуры не предоставлены. Адаптируйте по необходимости.)*

### Целевые модули:

*   **`frontend/js/managers/RightPanelManager.js`** (или создать, если не существует): Основной модуль для управления содержимым правой панели. Будет содержать логику для переключения между режимом Таймлайна и режимом Чата.
*   **`frontend/js/services/ChatService.js`**: Для инкапсуляции всей логики взаимодействия с бэкенд-сервисом чата (`/chat` и `/chat/history/*` эндпоинты).
*   **`frontend/js/ui/ChatView.js`** (или `ChatPanel.js`): Компонент UI, отвечающий за рендеринг интерфейса чата (контейнер сообщений, поле ввода, кнопка отправки).
*   **`frontend/js/ui/ChatMessage.js`**: Компонент для рендеринга отдельного сообщения в чате (может быть классом или функцией-фабрикой).
*   **`frontend/js/state/AppState.js`** (или аналогичный): Для хранения состояния чата, такого как `current_chat_id`, возможно, кэшированных сообщений, и состояния видимости панелей.
*   **`frontend/js/services/LocalStorageService.js`**: Обертка для работы с `localStorage` (для `current_chat_id`).
*   **`frontend/js/services/TTSService.js`**: Для инкапсуляции функции `speak`.

### Адаптированный код и инструкции:

1.  **`RightPanelManager.js`**:
    *   **Состояние:** Должен управлять текущим режимом правой панели (`'timeline'` или `'chat'`).
    *   **Метод `toggleChatMode()`:**
        *   Изменяет внутреннее состояние.
        *   Обновляет `display` CSS-свойство для контейнера таймлайна (например, `#versionTimeline`) и контейнера чата (например, `#chatInterfaceContainer`).
        *   Если переключается в режим `'chat'`, вызывает `ChatView.loadHistory()` (или аналогичный метод).
        *   Может управлять видимостью `#topPromptInput` глобального ввода промптов.
    *   **Инициализация:** Привязывает `toggleChatMode` к клику по `#chatButton`.

2.  **`ChatService.js`**:
    *   Метод `sendMessage(messageText, model, history)`: Выполняет `axios.post('/chat', ...)` и возвращает Promise с ответом.
    *   Метод `fetchChatHistory(chatId)`: Выполняет `axios.get('/chat/history/${chatId}')` и возвращает Promise.

3.  **`ChatView.js`**:
    *   **Элементы UI:** Управляет `#chatMessages`, `#chatInput`, `#submitChatMessage`.
    *   **Метод `initialize()`:**
        *   Находит элементы DOM.
        *   Привязывает обработчик к `#submitChatMessage` и `keypress` на `#chatInput` для вызова `this.handleSendMessage()`.
    *   **Метод `handleSendMessage()`:**
        *   Собирает данные (текст, модель).
        *   Вызывает `this.addMessageToUI('user', messageText)`.
        *   Вызывает `ChatService.sendMessage(...)`.
        *   При ответе вызывает `this.addMessageToUI('ai', responseText)` и `TTSService.speak(responseText)`.
    *   **Метод `addMessageToUI(sender, text)`:**
        *   Создает DOM-элемент для сообщения (используя `ChatMessage.create`).
        *   Добавляет в `#chatMessages`.
        *   Обеспечивает прокрутку.
    *   **Метод `loadHistory()`:**
        *   Получает `chatId` из `LocalStorageService`.
        *   Вызывает `ChatService.fetchChatHistory(chatId)`.
        *   Очищает `#chatMessages`.
        *   Для каждого сообщения из истории вызывает `this.addMessageToUI(...)`.
    *   **Зависимости:** `ChatService`, `LocalStorageService`, `TTSService`, `ChatMessage`.

4.  **`ChatMessage.js`**:
    *   Статический метод `create(sender, text)`: Создает и возвращает DOM-элемент сообщения (например, `div` с классами `chat-message ${sender}-message` и текстом).

5.  **`LocalStorageService.js`**:
    *   Метод `getCurrentChatId()`: Возвращает `localStorage.getItem('current_chat_id')`.
    *   Метод `setCurrentChatId(chatId)`: Устанавливает `localStorage.setItem('current_chat_id', chatId)`.

6.  **`TTSService.js`**:
    *   Метод `speak(text)`: Инкапсулирует логику `window.speechSynthesis.speak(...)` из оригинальной функции `speak`.

### Необходимые зависимости:

*   **`RightPanelManager`**: Доступ к DOM-элементам панелей, `ChatView`.
*   **`ChatView`**: `ChatService`, `LocalStorageService`, `TTSService`, `ChatMessage`.
*   **`ChatService`**: `axios`.
*   **Общее**: CSS для стилизации чата, сообщений, скрытия/отображения панелей и элементов. CSS-переходы для плавного скрытия/показа панелей.

### Пример структуры `ChatView.js`:
```javascript
// In frontend/js/ui/ChatView.js
import ChatService from '../services/ChatService.js';
import LocalStorageService from '../services/LocalStorageService.js';
import TTSService from '../services/TTSService.js';
// import ChatMessage from './ChatMessage.js'; // Если ChatMessage вынесен

class ChatView {
    constructor() {
        this.chatContainer = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.submitButton = document.getElementById('submitChatMessage');
        this.modelSelect = document.getElementById('modelSelect'); // Предполагается, что он доступен
        this.loadingIndicator = document.getElementById('loadingIndicator');

        this.isWaitingForResponse = false;
        this.initialize();
    }

    initialize() {
        this.submitButton.addEventListener('click', () => this.handleSendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !this.isWaitingForResponse) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
    }

    async handleSendMessage() {
        if (this.isWaitingForResponse) return;
        const messageText = this.chatInput.value.trim();
        if (!messageText) return;

        this.isWaitingForResponse = true;
        this.submitButton.disabled = true;
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';

        this.addMessageToUI('user', messageText);
        this.chatInput.value = '';

        const history = this.collectChatHistory(); // Собрать из DOM или AppState
        const selectedModel = this.modelSelect.value;

        try {
            const response = await ChatService.sendMessage(messageText, selectedModel, history);
            if (response && response.response) { // Убедимся, что есть ответ
                 this.addMessageToUI('tria', response.response);
                 TTSService.speak(response.response);
            } else {
                 this.addMessageToUI('tria', 'Получен пустой или некорректный ответ от сервера.');
            }
        } catch (error) {
            console.error('Error sending chat message:', error);
            this.addMessageToUI('tria', `Ошибка: ${error.message}`);
        } finally {
            this.isWaitingForResponse = false;
            this.submitButton.disabled = false;
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    collectChatHistory() {
        const chatHistory = [];
        if (this.chatContainer) {
            const messageElements = this.chatContainer.querySelectorAll('.chat-message');
            const lastMessages = Array.from(messageElements).slice(-10);
            lastMessages.forEach(msgElement => {
                const role = msgElement.classList.contains('user-message') ? 'user' : 'assistant';
                const content = msgElement.textContent; // Или более сложная логика извлечения текста
                chatHistory.push({ role, content });
            });
        }
        return chatHistory;
    }

    addMessageToUI(sender, text) {
        // Логика создания DOM элемента сообщения (аналог addMessage из chatMessages.js)
        // Например, используя ChatMessage.create(sender, text)
        const messageElement = document.createElement('div'); // Упрощенно
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.textContent = text;
        this.chatContainer.appendChild(messageElement);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    async loadHistory() {
        const chatId = LocalStorageService.getCurrentChatId();
        if (!chatId) {
            console.log('No chat ID found in localStorage.');
            this.chatContainer.innerHTML = ''; // Очистить, если нет истории
            return;
        }
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';
        try {
            const historyData = await ChatService.fetchChatHistory(chatId);
            this.chatContainer.innerHTML = ''; // Очистить перед заполнением
            (historyData.messages || []).forEach(msg => {
                this.addMessageToUI(msg.role === 'assistant' ? 'tria' : 'user', msg.content);
            });
        } catch (error) {
            console.error('Error loading chat history:', error);
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }
}
```

Эта структура предполагает, что `RightPanelManager.js` будет создавать экземпляр `ChatView` и вызывать `chatView.loadHistory()` при переключении на вкладку чата. CSS должен обрабатывать основное скрытие/отображение панелей.
