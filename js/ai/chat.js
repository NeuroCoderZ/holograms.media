// js/ai/chat.js

import { sendChatMessage as apiSendChatMessage } from '../services/apiService.js';
import { getJwtToken } from '../core/auth.js';
import { getChatHistory } from '../services/apiService.js';

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

  // --- ЗАГРУЗКА ИСТОРИИ ЧАТА (xMemory RAG) ---
  const loadChatHistory = async () => {
    try {
      const idToken = await getJwtToken();
      if (!idToken) {
        console.warn("[Chat] Нет JWT токена, история не загружена.");
        return;
      }

      const sessions = await import('../services/apiService.js').then(m => m.listChatSessions(idToken));
      if (!sessions || sessions.length === 0) {
        console.log("[Chat] Нет сохранённых сессий.");
        return;
      }

      // Берём последнюю сессию
      const lastSession = sessions[0];
      console.log(`[Chat] Загружаю историю из сессии: ${lastSession.id}`);

      const history = await getChatHistory(lastSession.id, idToken);
      if (!history || history.length === 0) {
        console.log("[Chat] История пуста.");
        return;
      }

      // Добавляем историю в чат (без анимации)
      for (const msg of history) {
        const sender = msg.role === 'user' ? 'user' : 'tria';
        const content = msg.content || msg.message?.content || '';
        if (content) {
          appendMessage(content, sender);
        }
      }
      console.log(`[Chat] Загружено ${history.length} сообщений из истории.`);
    } catch (err) {
      console.error("[Chat] Ошибка загрузки истории:", err);
    }
  };

  loadChatHistory();

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
            'THOUGHT': '💭 Мышление',
            'GROUNDING': '🌐 Веб-поиск',
            'RESONANCE': '🔮 Расчет резонанса',
            'ANALYSIS': '🧪 Анализ контекста',
            'CRITIC': '🔬 Критический отбор'
        };

        const flushQueue = () => {
            if (charQueue.length === 0) { isTyping = false; return; }
            isTyping = true;
            const chunk = charQueue.shift();
            
            // Обработка THINKING маркеров
            if (chunk && chunk.startsWith('[[THINKING:')) {
                const match = chunk.match(/\[\[THINKING:(.*?)]]/);
                const stage = match ? match[1] : '...';
                
                // Если это новый этап, создаем для него строку
                const label = stageLabels[stage] || `● ${stage}`;
                const stageEl = document.createElement('div');
                stageEl.className = `thinking-stage stage-${stage.toLowerCase()}`;
                stageEl.innerHTML = `<span class="stage-label">${label}...</span><span class="stage-detail"></span>`;
                thinkingContainer.appendChild(stageEl);
                thinkingContainer.style.display = 'block';
                
                setTimeout(flushQueue, 0);
                return;
            }

            // Обработка данных ВНУТРИ этапа (например, мысли модели)
            if (chunk && chunk.startsWith('[[THOUGHT_DATA:')) {
                const thoughtText = chunk.replace('[[THOUGHT_DATA:', '').replace(']]', '');
                const lastStage = thinkingContainer.lastElementChild;
                if (lastStage) {
                    const detailEl = lastStage.querySelector('.stage-detail');
                    if (detailEl) detailEl.textContent += thoughtText;
                }
                setTimeout(flushQueue, 0);
                return;
            }

            // Первый реальный контент — сворачиваем блок мышления ПОСЛЕ начала основного вывода
            if (!hasRealContent && chunk && !chunk.startsWith('[[')) {
                hasRealContent = true;
                if (thinkingContainer.children.length > 0) {
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'thinking-toggle-btn';
                    toggleBtn.innerHTML = '<span class="icon">▶</span> Мышление';
                    
                    msgDiv.insertBefore(toggleBtn, thinkingContainer);
                    
                    // Плавное автоматическое сворачивание
                    setTimeout(() => {
                        thinkingContainer.classList.add('collapsed');
                    }, 500);

                    toggleBtn.addEventListener('click', () => {
                        const isCollapsed = thinkingContainer.classList.toggle('collapsed');
                        toggleBtn.querySelector('.icon').textContent = isCollapsed ? '▶' : '▼';
                        toggleBtn.classList.toggle('expanded', !isCollapsed);
                    });
                }
            }

            if (hasRealContent) {
                contentDiv.textContent += chunk;
            }
            
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
        // Микрофон — такой же сенсор, как камера: в гостевом режиме не включаем.
        // Согласие даётся один раз на все сенсоры (docs/RU/LEGAL_STRATEGY.md §6),
        // поэтому проверка здесь такая же, как для камеры в init.js.
        const { state } = await import('../core/init.js');
        if (state.sensorsAllowed === false) {
          console.warn('[Chat] Гостевой режим — микрофон недоступен');
          if (state.consentManager?.show) state.consentManager.show();
          return;
        }

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

  // --- LIVE STT INTEGRATION ---
  document.addEventListener('tria-live-stt', (e) => {
    const { text, isFinal } = e.detail;
    if (chatInput) {
      chatInput.value = text;
      // Триггерим ресайз инпута под новый текст
      chatInput.dispatchEvent(new Event('input'));
      
      if (isFinal) {
        chatInput.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.5)';
        setTimeout(() => { chatInput.style.textShadow = ''; }, 1500);
      }
    }
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
