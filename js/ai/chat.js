// js/ai/chat.js

import { sendChatMessage as apiSendChatMessage } from '../services/apiService.js';
import { getJwtToken } from '../core/auth.js';

let isChatInitialized = false;

export function initializeTriaChat() {
  console.log("Инициализация чата Триа через Backend API...");

  const messagesContainer = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendButton = document.getElementById('submitChatMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');

  if (!messagesContainer || !chatInput || !sendButton || !loadingIndicator) {
    console.error("Не удалось инициализировать чат: элементы DOM не найдены.");
    return;
  }

  isChatInitialized = true;

  /**
   * Добавляет сообщение в контейнер. 
   * Поддерживает THINKING маркеры для визуализации этапов мышления.
   */
  const appendMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}-message`;

    if (sender === 'tria') {
        const thinkingContainer = document.createElement('div');
        thinkingContainer.className = 'thinking-indicator';
        thinkingContainer.style.display = 'none';
        thinkingContainer.style.fontSize = '0.8em';
        thinkingContainer.style.opacity = '0.6';
        thinkingContainer.style.marginBottom = '8px';
        thinkingContainer.style.fontStyle = 'italic';
        msgDiv.appendChild(thinkingContainer);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tria-content';
        contentDiv.style.whiteSpace = 'pre-wrap';
        contentDiv.style.wordBreak = 'break-word';
        msgDiv.appendChild(contentDiv);
        messagesContainer.appendChild(msgDiv);

        const TYPING_DELAY_MS = 12;
        const charQueue = [];
        let isTyping = false;
        let hasRealContent = false;
        let thinkingCollapsed = false;

        const stageLabels = {
            'RESEARCH': '🔍 Поиск в базе знаний',
            'SYNTHESIS': '🧠 Синтез ответа',
            'SELECTION': '🔬 Критический отбор',
            'GROUNDING': '🌐 Веб-поиск'
        };

        const flushQueue = () => {
            if (charQueue.length === 0) { isTyping = false; return; }
            isTyping = true;
            const chunk = charQueue.shift();
            
            // Обработка THINKING маркеров
            if (chunk && chunk.startsWith('[[THINKING:')) {
                const match = chunk.match(/\[\[THINKING:(.*?)]]/);
                const stage = match ? match[1] : '...';
                const label = stageLabels[stage] || `● ${stage}`;

                const stageEl = document.createElement('div');
                stageEl.style.cssText = 'font-size:0.78em; opacity:0.55; font-style:italic; padding:2px 0;';
                stageEl.textContent = label + '...';
                thinkingContainer.appendChild(stageEl);
                thinkingContainer.style.display = 'block';
                setTimeout(flushQueue, 0);
                return;
            }

            // Первый реальный контент — сворачиваем блок мышления
            if (!hasRealContent && chunk && !chunk.startsWith('[[')) {
                hasRealContent = true;
                if (thinkingContainer.children.length > 0) {
                    thinkingContainer.style.overflow = 'hidden';
                    thinkingContainer.style.maxHeight = '0px';
                    thinkingContainer.style.transition = 'max-height 0.3s ease';

                    const toggleBtn = document.createElement('button');
                    toggleBtn.textContent = '▶ Мышление';
                    toggleBtn.style.cssText = 'font-size:0.72em; opacity:0.4; background:none; border:none; color:currentColor; cursor:pointer; padding:0 0 4px 0; display:block;';
                    let expanded = false;
                    toggleBtn.addEventListener('click', () => {
                        expanded = !expanded;
                        thinkingContainer.style.maxHeight = expanded ? '200px' : '0px';
                        toggleBtn.textContent = expanded ? '▼ Мышление' : '▶ Мышление';
                    });
                    msgDiv.insertBefore(toggleBtn, thinkingContainer);
                }
            }

            contentDiv.textContent += chunk;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            setTimeout(flushQueue, TYPING_DELAY_MS);
        };

        const updateContent = (newChunk) => {
            if (!newChunk) return;
            if (newChunk.startsWith('[[THINKING:')) {
                charQueue.push(newChunk);
            } else {
                for (const char of newChunk) charQueue.push(char);
            }
            if (!isTyping) flushQueue();
        };

        if (text) updateContent(text);
        return updateContent;
    } else {
        msgDiv.textContent = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return null;
    }
  };

  const handleSend = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    appendMessage(message, 'user');
    loadingIndicator.style.display = 'block';

    try {
      const token = getJwtToken();
      if (!token) {
        throw new Error("Для общения с Триа необходима авторизация.");
      }

      const modelSelect = document.getElementById('modelSelect');
      const selectedModel = modelSelect ? modelSelect.value : null;

      // Создаем контейнер для ответа ИИ заранее
      const updateTriaUI = appendMessage('', 'tria');
      let streamedText = '';

      const fullText = await apiSendChatMessage(message, token, selectedModel, (chunk) => {
        streamedText += chunk;
        updateTriaUI(chunk);
      });

      if (!streamedText.trim() && !(fullText || '').trim()) {
        updateTriaUI('Триа не смогла сформировать ответ. Попробуйте уточнить запрос и отправить его еще раз.');
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      appendMessage("Триа недоступна. Ошибка: " + error.message, 'tria');
    } finally {
      loadingIndicator.style.display = 'none';
    }
  };

  // --- LIVE AUDIO INTEGRATION ---
  const micButton = document.getElementById('micButton');
  let isLiveActive = false;

  if (micButton) {
    micButton.onclick = async () => {
      const { liveAudioService } = await import('../services/LiveAudioService.js');
      const { microphoneManager } = await import('../main.js'); 

      if (!isLiveActive) {
        try {
          await liveAudioService.connect();
          await microphoneManager.startLiveStreaming((pcmBuffer) => {
            liveAudioService.sendAudio(pcmBuffer);
          });
          micButton.classList.add('active');
          isLiveActive = true;
          console.log("[Chat] Live Mode ENABLED.");
        } catch (err) {
          console.error("[Chat] Failed to start Live Mode:", err);
        }
      } else {
        microphoneManager.stopLiveStreaming();
        liveAudioService.disconnect();
        micButton.classList.remove('active');
        isLiveActive = false;
        console.log("[Chat] Live Mode DISABLED.");
      }
    };
  }

  sendButton.onclick = handleSend;

  chatInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
  });

  console.log("Чат Триа успешно инициализирован и подключен к бэкенду.");
}

export const setupChat = initializeTriaChat;

export function sendChatMessage(message) {
  if (isChatInitialized) {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('submitChatMessage');
    if (chatInput && sendButton) {
      chatInput.value = message;
      sendButton.click();
    }
  } else {
    console.warn("Чат не инициализирован. Вызовите initializeTriaChat() сначала.");
  }
}
