// frontend/js/ai/chat.js - Функционал чата и взаимодействие с Tria
import { state } from '../core/init.js';
import { sendChatMessage as sendChatApiRequest } from '../services/apiService.js'; // ИМПОРТИРУЕМ НОВУЮ ФУНКЦИЮ
import { auth } from '../core/firebaseInit.js'; // Импортируем auth для получения токена

let isWaitingForResponse = false;
let chatHistoryContainer = null; 
let moduleScopedChatInput = null;

// Добавление сообщения в чат
function addMessageToChat(sender, messageText) {
    if (!chatHistoryContainer) {
        console.error('Контейнер для сообщений чата не найден!');
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender);
    
    const formattedMessage = formatMessage(messageText);
    messageElement.innerHTML = `<span class="sender">${sender === 'user' ? 'Вы' : 'Триа'}:</span> ${formattedMessage}`;
    
    chatHistoryContainer.appendChild(messageElement);
    
    setTimeout(() => {
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }, 10);
}

// Форматирование сообщения (базовый маркдаун)
function formatMessage(message) {
    if (!message) return '';
    
    let formatted = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    formatted = formatted.replace(/```([\s\S]*?)```/g, (_, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

function showLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none'; // Используем flex для центрирования
    }
}

export function setupChat(appState) {
    console.log('Инициализация чата...');
    chatHistoryContainer = appState.uiElements.containers.chatMessages;
    moduleScopedChatInput = appState.uiElements.inputs.chatInput;

    if (!chatHistoryContainer) {
        console.error('Контейнер для истории чата (chatMessages) не найден!');
        return;
    }
    if (!moduleScopedChatInput) {
        console.error('Поле ввода чата (chatInput) не найдено!');
        return;
    }
    
    console.log('Чат инициализирован.');
}

export async function sendChatMessage(messageText) {
    if (!messageText || messageText.trim().length === 0 || isWaitingForResponse) {
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        addMessageToChat('tria', 'Ошибка: вы должны быть авторизованы, чтобы использовать чат.');
        return;
    }

    isWaitingForResponse = true;
    const userMessage = messageText.trim();
    
    if (moduleScopedChatInput) moduleScopedChatInput.value = '';
    addMessageToChat('user', userMessage);
    
    try {
        showLoadingIndicator(true);
        console.log(`Sending to Tria API: "${userMessage}"`);
        
        const idToken = await user.getIdToken();
        const triaResponseText = await sendChatApiRequest(userMessage, idToken);

        if (triaResponseText) {
            addMessageToChat('tria', triaResponseText);
        } else {
            addMessageToChat('tria', 'Извините, Tria вернула пустой ответ.');
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения в sendChatMessage:', error);
        addMessageToChat('tria', `Произошла критическая ошибка: ${error.message}`);
    } finally {
        showLoadingIndicator(false);
        isWaitingForResponse = false;
    }
}
