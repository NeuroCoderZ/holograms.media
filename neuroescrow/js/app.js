/**
 * NeuroEscrow — Voice-First Intelligent Agent
 * Hermes connects clients and neurocoders through voice
 */

class NeuroEscrowApp {
    constructor() {
        this.currentView = 'hermes';
        this.userData = null;
        this.voiceState = 'IDLE'; // IDLE, LISTENING, PROCESSING
        this.isRecording = false;
        this.isProcessing = false;
        this.deals = [];
        this.balance = 0;
        this.responseTimeout = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.chatMessages = [];
        this.currentStream = null;
        this.currentFacingMode = 'user';
        this.recognition = null;
        this.contractAnswers = {};
        this.taskSpecHistory = [];
        
        this.init();
    }

    async init() {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            // Bot API 8.0+: requestFullscreen for desktop/immersive
            if (typeof tg.requestFullscreen === 'function') {
                try {
                    const fsResult = tg.requestFullscreen();
                    if (fsResult && typeof fsResult.catch === 'function') {
                        fsResult.catch(() => {
                            // Already expanded via tg.expand() above
                        });
                    }
                } catch (e) {
                    // requestFullscreen failed — already expanded
                }
            }

            // Listen for fullscreen state changes
            tg.onEvent('fullscreenChanged', () => {
                console.log('[TG] fullscreenChanged:', tg.isFullscreen);
                const fsBtn = document.getElementById('tg-fullscreen-btn');
                if (fsBtn) fsBtn.style.display = tg.isFullscreen ? 'none' : 'inline-block';
            });

            // Handle fullscreen failure gracefully
            tg.onEvent('fullscreenFailed', (reason) => {
                console.warn('[TG] fullscreenFailed:', reason);
                tg.expand(); // Fallback
            });

            // Safe area insets — apply CSS padding to respect device notches
            this.applySafeAreaInsets();
            tg.onEvent('safeAreaChanged', () => this.applySafeAreaInsets());
            tg.onEvent('contentSafeAreaChanged', () => this.applySafeAreaInsets());
        }
        this.userData = telegram.getUser();
        this.updateHeader();
        await this.loadCache();
        this.navigate('hermes');

        window.addEventListener('ton:statusChange', (e) => {
            this.onTonStatusChange(e.detail);
        });

        this.requestDataFromBot();

        // Fullscreen button handler (user gesture required on TG Desktop)
        const fsBtn = document.getElementById('tg-fullscreen-btn');
        if (fsBtn && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            if (typeof tg.requestFullscreen === 'function') {
                fsBtn.addEventListener('click', () => {
                    const fsResult = tg.requestFullscreen();
                    if (fsResult && typeof fsResult.catch === 'function') {
                        fsResult.catch(e => {
                            console.warn('[TG] Fullscreen blocked:', e);
                            tg.expand(); // Fallback
                        });
                    } else {
                        tg.expand(); // Fallback
                    }
                });
                // Hide button if already in fullscreen
                if (tg.isFullscreen === true) {
                    fsBtn.style.display = 'none';
                }
            } else {
                fsBtn.style.display = 'none';
            }
        }

        // Priority 2-3: Voice input, Contract Q&A, Task Spec history
        this.initVoiceInput();
        this.loadTaskSpecHistory();

        const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
        if (micBtn) micBtn.onclick = () => this.toggleVoiceRecording();

        const exportBtn = document.getElementById('exportTaskSpecBtn');
        if (exportBtn) exportBtn.onclick = () => this.exportTaskSpec();

        const historyToggle = document.getElementById('toggleTaskHistoryBtn');
        const historyPanel = document.getElementById('task-history-panel');
        if (historyToggle && historyPanel) {
            historyToggle.onclick = () => {
                historyPanel.classList.toggle('visible');
                telegram.haptic('light');
            };
        }

        this.renderContractQuestions([
            { id: 'q1', text: 'Каков дедлайн исполнения смарт-контракта?' },
            { id: 'q2', text: 'Укажите условия возврата средств при срыве сроков.' },
            { id: 'q3', text: 'Требуется ли арбитраж третьей стороны?' }
        ]);
    }

    updateHeader() {
        const nameEl = document.getElementById('user-name');
        
        if (this.userData) {
            const name = this.userData.first_name || this.userData.username || 'Пользователь';
            nameEl.textContent = name;
        } else {
            nameEl.textContent = 'Гость';
        }
    }

    applySafeAreaInsets() {
        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        // Apply safe area insets as CSS custom properties
        // Docs: https://docs.telegram-mini-apps.com/packages/tma-js-sdk/features/viewport
        const root = document.documentElement;
        if (tg.safeAreaInset) {
            root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
            root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
            root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
            root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
        }
        if (tg.contentSafeAreaInset) {
            root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
            root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
        }

        // Use viewportStableHeight for layout (doesn't change during gestures)
        if (tg.viewportStableHeight) {
            root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
        }
    }

    navigate(view) {
        // Reset voice state when switching tabs
        if (view !== 'hermes' && this.voiceState !== 'IDLE') {
            this.resetVoiceState();
        }
        
        this.currentView = view;
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        
        // Show/hide chat input based on view (split-chat-input is inside left pane)
        const chatInput = document.getElementById('chat-input-container');
        if (chatInput) {
            chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
        }
        
        // Also handle the split-layout chat input
        const splitChatInput = document.querySelector('.split-chat-input');
        if (splitChatInput) {
            splitChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
        }
        
        // Hide fixed chat input container when not on hermes
        const fixedChatInput = document.querySelector('.chat-input-container:not(.split-chat-input)');
        if (fixedChatInput) {
            fixedChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
        }
        
        switch(view) {
            case 'hermes':
                this.renderHermesView(main);
                break;
            case 'deals':
                this.renderDealsView(main);
                break;
            case 'profile':
                this.renderProfileView(main);
                break;
        }
        
        telegram.haptic('light');
    }

    // -------------------------------------------------------------------------
    // Hermes View (Voice Interface - Main Screen)
    // -------------------------------------------------------------------------

    renderHermesView(container) {
        const view = document.createElement('div');
        view.className = 'view has-top-panel';
        
        view.innerHTML = `
            <div class="split-layout">
                <!-- LEFT PANE: Hermes Chat -->
                <div class="split-pane left-pane">
                    <div class="pane-header">
                        <span class="pane-header-dot purple"></span>
                        <span class="pane-header-icon">🎙️</span>
                        <span class="pane-header-title">Гермес — Чат</span>
                    </div>
                    <div class="pane-content">
                        <div class="top-control-panel">
                            <div class="left-mic-panel">
                                <button class="mic-button" id="micButton">
                                    <span class="voice-icon">🎙️</span>
                                </button>
                            </div>
                        </div>
                        <div class="chat-messages" id="chat-messages"></div>
                        <!-- Chat input inside left pane (desktop) -->
                        <div class="chat-input-container split-chat-input" id="chat-input-container">
                            <button class="attach-btn" id="attach-btn" onclick="app.showAttachMenu()">
                                <span>📎</span>
                            </button>
                            <input type="text" class="chat-input" id="chat-input" placeholder="Напишите сообщение..." />
                            <button class="send-btn" id="send-btn" onclick="app.sendTextMessage()">
                                <span>➤</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- DIVIDER -->
                <div class="split-divider" id="split-divider"></div>

                <!-- RIGHT PANE: Smart Contract / ТЗ -->
                <div class="split-pane right-pane">
                    <div class="pane-header">
                        <span class="pane-header-dot green"></span>
                        <span class="pane-header-icon">📋</span>
                        <span class="pane-header-title">Смарт-контракт</span>
                    </div>
                    <div class="pane-content">
                        <div class="right-contract-panel">
                            <div id="task-spec" class="task-spec-container">
                                <div class="task-spec-title">Техническое задание</div>
                                <div id="task-spec-content">Ожидание ТЗ от Гермеса...</div>
                                <div style="display:flex;gap:6px;margin-top:8px;">
                                    <button id="exportTaskSpecBtn" class="export-btn-sm" type="button">📥 Экспорт</button>
                                    <button id="toggleTaskHistoryBtn" class="export-btn-sm" type="button"> История</button>
                                </div>
                            </div>
                        </div>
                        <div id="contract-qa-container" class="contract-qa-panel"></div>
                    </div>
                </div>
            </div>

            <!-- Task history (overlay) -->
            <div id="task-history-panel" class="task-history-panel">
                <div id="task-history-list"></div>
            </div>
        `;
        
        container.appendChild(view);
        this.renderChatMessages();
        this.initSplitDivider();
        this.bindChatInputEvents();
    }

    bindChatInputEvents() {
        // Enter key fix for chat input — prevent form submit / page reload
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendTextMessage();
                }
            });
        }

        // Prevent any accidental form submit if input is wrapped in <form>
        const chatContainer = document.getElementById('chat-input-container');
        if (chatContainer) {
            chatContainer.addEventListener('submit', (e) => e.preventDefault());
        }

        // Ensure send button is type="button" not "submit"
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn && !sendBtn.getAttribute('type')) {
            sendBtn.setAttribute('type', 'button');
        }
    }

    initSplitDivider() {
        const divider = document.getElementById('split-divider');
        if (!divider) return;

        let isDragging = false;
        let startX, startY, startWidth;

        const onMouseDown = (e) => {
            isDragging = true;
            divider.classList.add('dragging');
            startX = e.clientX || e.touches?.[0]?.clientX || 0;
            startY = e.clientY || e.touches?.[0]?.clientY || 0;
            const leftPane = divider.previousElementSibling;
            startWidth = leftPane?.getBoundingClientRect().width || 0;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = (e.clientX || 0) - startX;
            const container = divider.parentElement;
            const totalWidth = container?.getBoundingClientRect().width || 1;
            const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
            const leftPane = divider.previousElementSibling;
            const rightPane = divider.nextElementSibling;
            if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
            if (rightPane) rightPane.style.flex = '1';
        };

        const onMouseUp = () => {
            isDragging = false;
            divider.classList.remove('dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const dx = (e.touches?.[0]?.clientX || 0) - startX;
            const container = divider.parentElement;
            const totalWidth = container?.getBoundingClientRect().width || 1;
            const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
            const leftPane = divider.previousElementSibling;
            if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
        };

        const onTouchEnd = () => {
            isDragging = false;
            divider.classList.remove('dragging');
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        divider.addEventListener('mousedown', onMouseDown);
        divider.addEventListener('touchstart', (e) => {
            startX = e.touches?.[0]?.clientX || 0;
            startY = e.touches?.[0]?.clientY || 0;
            onMouseDown(e);
        }, { passive: true });
    }

    toggleVoice() {
        // Explicit protection against multiple taps during processing
        if (this.voiceState === 'PROCESSING' || this.isProcessing) {
            return;
        }
        
        if (this.voiceState === 'LISTENING') {
            this.stopVoiceRecording();
        } else {
            this.voiceState = 'LISTENING';
            this.updateVoiceButton();
            this.startVoiceRecording();
        }
        
        telegram.haptic('medium');
    }

    async startVoiceRecording() {
        try {
            const tg = window.Telegram?.WebApp;
            // Try native Telegram voice recording (Bot API 9.6+)
            if (tg && typeof tg.requestVoiceMessage === 'function') {
                const result = await tg.requestVoiceMessage();
                
                if (result && result.file_id) {
                    this.sendVoiceToBot(result.file_id, result.duration);
                } else {
                    throw new Error('No file_id received');
                }
            } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Fallback to manual recording
                this.fallbackToManualRecording();
            } else {
                telegram.showAlert('Запись голоса не поддерживается в вашем браузере. Используйте текстовый ввод.');
            }
        } catch (error) {
            console.error('[Voice] Recording failed:', error.message);
            this.handleVoiceError(error);
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.resetVoiceState();
    }

    fallbackToManualRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];
                
                this.mediaRecorder.ondataavailable = (e) => {
                    this.audioChunks.push(e.data);
                };
                
                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
                    this.uploadVoiceBlob(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };
                
                this.mediaRecorder.start();
                console.log('[NeuroEscrow] Fallback recording started');
            })
            .catch(error => {
                this.handleVoiceError(error);
            });
    }

    uploadVoiceBlob(blob) {
        // This would require bot-side endpoint for blob upload
        // For now, just show error
        this.handleVoiceError(new Error('Manual recording not yet implemented'));
    }

    sendVoiceToBot(fileId, duration) {
        this.voiceState = 'PROCESSING';
        this.isProcessing = true;
        this.updateVoiceButton();
        this.setupResponseTimeout();
        
        const payload = {
            action: 'voice_message',
            file_id: fileId,
            duration: duration,
            timestamp: Date.now(),
            user_id: telegram.getUserId()
        };
        
        telegram.sendData(payload);
        console.log('[NeuroEscrow] Voice sent to bot:', fileId);
    }

    updateVoiceButton() {
        const btn = document.getElementById('voice-btn');
        const status = document.getElementById('voice-status');
        
        if (!btn) return;
        
        // Remove all state classes
        btn.classList.remove('recording', 'processing');
        
        switch (this.voiceState) {
            case 'IDLE':
                if (status) { status.textContent = ''; status.style.display = 'none'; }
                this.isRecording = false;
                break;
                
            case 'LISTENING':
                btn.classList.add('recording');
                if (status) { status.textContent = 'Слушаю...'; status.style.display = 'block'; }
                this.isRecording = true;
                break;
                
            case 'PROCESSING':
                btn.classList.add('processing');
                if (status) { status.textContent = 'Гермес обрабатывает...'; status.style.display = 'block'; }
                this.isRecording = false;
                break;
        }
    }

    setupResponseTimeout() {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
        }
        
        this.responseTimeout = setTimeout(() => {
            if (this.voiceState === 'PROCESSING') {
                this.handleVoiceError(new Error('timeout'));
            }
        }, 30000);
    }

    handleVoiceError(error) {
        console.error('[NeuroEscrow] Voice error:', error);
        
        this.resetVoiceState();
        
        let message = 'Ошибка записи голоса';
        
        if (error.message.includes('permission')) {
            message = 'Нет доступа к микрофону';
        } else if (error.message.includes('timeout')) {
            message = 'Превышено время ожидания';
        } else if (error.message.includes('cancelled')) {
            message = 'Запись отменена';
        }
        
        telegram.showAlert(message);
        telegram.hapticNotification('error');
    }

    resetVoiceState() {
        this.voiceState = 'IDLE';
        this.isRecording = false;
        this.isProcessing = false;
        this.updateVoiceButton();
        
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
            this.responseTimeout = null;
        }
    }

    handleDraftCreated(draft) {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
        }
        
        // Check for duplicates
        const existingIndex = this.deals.findIndex(d => d.id === draft.id);
        if (existingIndex !== -1) {
            this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
        } else {
            this.deals.unshift({ ...draft, type: 'draft', isNew: true });
        }
        
        this.resetVoiceState();
        this.saveCache(); // Save immediately after adding draft
        this.navigate('deals');
        
        telegram.hapticNotification('success');
        telegram.showAlert('Черновик создан');
        
        console.log('[NeuroEscrow] Draft created:', draft.id);
    }

    // -------------------------------------------------------------------------
    // Deals View
    // -------------------------------------------------------------------------

    renderDealsView(container) {
        const view = document.createElement('div');
        view.className = 'view';
        
        const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
        
        view.innerHTML = `
            <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
            ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
            <div id="deals-list">
                ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
            </div>
        `;
        
        container.appendChild(view);
    }

    renderDraftCard(draft) {
        const title = this.escapeHtml(draft.title || 'Без названия');
        const description = this.escapeHtml(draft.description || '');
        const budget = draft.budget || 'Не указан';
        const deadline = draft.deadline || 'Не указан';
        
        return `
            <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
                    <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
                </div>
                <div class="card-title">${title}</div>
                <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
                <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
                    <span>💰 ${budget}</span>
                    <span>⏱️ ${deadline}</span>
                </div>
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
                    <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
                </div>
            </div>
        `;
    }

    dealCard(deal) {
        const statusColors = {
            'draft': 'rgba(255, 255, 255, 0.34)',
            'negotiating': '#dddddd',
            'in_progress': '#dddddd',
            'completed': 'rgba(255, 255, 255, 0.67)'
        };
        
        const statusNames = {
            'draft': 'Черновик',
            'negotiating': 'Переговоры',
            'in_progress': 'В работе',
            'completed': 'Завершена'
        };
        
        const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
        const statusName = statusNames[deal.status] || deal.status;
        
        return `
            <div class="card" style="border-left:2px solid ${color};">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
                    <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
                </div>
                <div class="card-title">${deal.title}</div>
                <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
                    <span>💰 ${deal.budget} USDT</span>
                    <span>👤 ${deal.counterparty}</span>
                </div>
                <div style="margin-top:12px;">
                    <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
                </div>
            </div>
        `;
    }

    getSampleDeals() {
        return [
            { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
            { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
        ];
    }

    viewDeal(dealId) {
        telegram.sendData({ action: 'view_deal', deal_id: dealId });
        telegram.showAlert('Открываю детали сделки в боте...');
    }

    editDraft(draftId) {
        telegram.sendData({ action: 'edit_draft', draft_id: draftId });
        telegram.showAlert('Открываю редактор в боте...');
    }

    publishDraft(draftId) {
        telegram.sendData({ action: 'publish_draft', draft_id: draftId });
        telegram.showAlert('Публикую черновик...');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    // -------------------------------------------------------------------------
    // Profile View
    // -------------------------------------------------------------------------

    renderProfileView(container) {
        const view = document.createElement('div');
        view.className = 'view';
        
        view.innerHTML = `
            <div class="card" style="text-align:center;padding:24px;">
                <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
                <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
                
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                    <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">
                        💝 Поддержать
                    </button>
                    <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">
                        ⭐ Чаевые
                    </button>
                </div>
                
                <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">
                    TON • USDT • Telegram Stars
                </div>
            </div>
            
            <div id="ton-connect" style="margin:16px 0;"></div>
            
            <div class="card">
                <div class="card-title">Настройки</div>
                <div class="form-group">
                    <label class="form-label">LLM Модель</label>
                    <select class="form-input" id="model-selector">
                        <option value="auto">Автоматически</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="claude">Claude</option>
                        <option value="grok">Grok</option>
                        <option value="custom">Своя модель</option>
                    </select>
                </div>
            </div>
        `;
        
        container.appendChild(view);
        
        setTimeout(() => {
            tonConnect.init('ton-connect');
        }, 100);
    }

    donate() {
        telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
    }

    leaveTip() {
        telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
    }

    onTonStatusChange(detail) {
        console.log('[App] TON status changed:', detail);
    }

    async loadCache() {
        try {
            const cached = await telegram.cloudGet('neuroescrow_data');
            if (cached) {
                this.deals = cached.deals || [];
                this.balance = cached.balance || 0;
                this.chatMessages = cached.chatMessages || [];
                console.log('[App] Cache loaded');
            }
        } catch (e) {
            console.log('[App] No cache found');
        }
    }

    async saveCache() {
        const data = {
            deals: this.deals,
            balance: this.balance,
            chatMessages: this.chatMessages,
            timestamp: Date.now()
        };
        await telegram.cloudSet('neuroescrow_data', data);
    }

    async loadSession(sessionId) {
        const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
            ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
            : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';

        try {
            const resp = await fetch(baseUrl + 'session/' + sessionId, { mode: 'cors' });
            if (!resp.ok) return;

            const session = await resp.json();
            const messages = session.messages || [];

            this.chatMessages = messages.map(msg => ({
                sender: msg.role === 'user' ? 'user' : 'hermes',
                text: msg.content || msg.text || '',
                timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
            }));

            this.renderChatMessages();
            this.saveCache();
        } catch (e) {
            console.error('[App] Load session error:', e.message);
        }
    }

    async loadSessionsList() {
        const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
            ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
            : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';

        try {
            const resp = await fetch(baseUrl + 'sessions', { mode: 'cors' });
            if (!resp.ok) return [];
            return await resp.json();
        } catch (e) {
            console.error('[App] Load sessions error:', e.message);
            return [];
        }
    }

    requestDataFromBot() {
        telegram.sendData({ action: 'get_dashboard_data' });
    }

    handleBotData(data) {
        console.log('[App] Data from bot:', data);
        
        // Handle different event types
        if (data.event === 'draft_created' && data.draft) {
            this.handleDraftCreated(data.draft);
            return;
        }
        
        if (data.event === 'error') {
            this.handleVoiceError(new Error(data.error || 'Unknown error'));
            return;
        }

        if (data.event === 'hermes_reply' && data.text) {
            this.addChatMessage('hermes', data.text);
            return;
        }

        if (data.event === 'moderation_block') {
            telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
            return;
        }
        
        // Handle dashboard data
        if (data.deals) this.deals = data.deals;
        if (data.balance !== undefined) this.balance = data.balance;
        
        this.saveCache();
        
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        switch(this.currentView) {
            case 'hermes': this.renderHermesView(main); break;
            case 'deals': this.renderDealsView(main); break;
            case 'profile': this.renderProfileView(main); break;
        }
    }

    emptyState(icon, text) {
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <div class="empty-text">${text}</div>
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Chat Interface Methods
    // -------------------------------------------------------------------------

    renderChatMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = this.chatMessages.map((msg, idx) => {
            const isLastHermes = idx === this.chatMessages.length - 1 && msg.sender === 'hermes' && msg.text === '';
            const streamingClass = isLastHermes ? ' streaming' : '';
            const isHermesComplete = msg.sender === 'hermes' && msg.text !== '' && !isLastHermes;
            const feedbackHtml = isHermesComplete && !msg.feedback ? `
                <div class="feedback-buttons">
                    <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'up')">👍</button>
                    <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'down')">👎</button>
                </div>
            ` : '';
            return `
            <div class="chat-message ${msg.sender}">
                <div class="message-bubble${streamingClass}">
                    ${this.escapeHtml(msg.text)}
                    <span class="msg-time">${this.formatTime(msg.timestamp)}</span>
                    ${feedbackHtml}
                </div>
            </div>
        `;
        }).join('');

        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }

    addChatMessage(sender, text) {
        this.chatMessages.push({
            sender,
            text,
            timestamp: Date.now()
        });
        this.renderChatMessages();
        this.saveCache();
    }

    showTypingIndicator() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.id = 'typing-indicator';
        typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    hideTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    async sendTextMessage() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        this.addChatMessage('user', text);
        input.value = '';

        telegram.haptic('light');

        // Call Hermes backend
        try {
            const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
                ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
                : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';

            console.log('[Chat] Fetching:', baseUrl + 'chat');

            // Show typing indicator
            this.showTypingIndicator();

            // Try streaming first
            const streamUrl = baseUrl + 'chat/stream';
            const response = await fetch(streamUrl, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    user_id: telegram.getUserId(),
                    session_id: `tg_${telegram.getUserId()}`,
                    persona: 'hermes'
                })
            });

            console.log('[Chat] Response status:', response.status, response.statusText);

            // Hide typing indicator
            this.hideTypingIndicator();

            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('text/event-stream')) {
                // Streaming response — typewriter effect
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';

                // Create empty hermes message bubble for streaming
                const msgIdx = this.chatMessages.length;
                this.chatMessages.push({ sender: 'hermes', text: '', timestamp: Date.now() });
                this.renderChatMessages();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line.replace('data: ', ''));
                            if (parsed.done) break;
                            if (parsed.char !== undefined) {
                                fullText += parsed.char;
                                this.chatMessages[msgIdx].text = fullText;
                                this.renderChatMessages();
                            }
                        } catch { /* skip malformed SSE lines */ }
                    }
                }

                this.saveCache();
            } else {
                // Fallback: regular JSON response
                const data = await response.json();

                if (data.blocked) {
                    this.addChatMessage('system', `⚠️ ${data.reason}`);
                } else if (data.response) {
                    this.addChatMessage('hermes', data.response);
                } else if (data.error) {
                    this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
                }
            }
        } catch (error) {
            console.error('[Chat] Fetch failed:', error.message);
            this.hideTypingIndicator();
            this.addChatMessage('system', '❌ Ошибка соединения с сервером');
        }
    }

    showAttachMenu() {
        const menu = document.getElementById('attach-menu');
        if (!menu) return;

        menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
        telegram.haptic('light');
    }

    hideAttachMenu() {
        const menu = document.getElementById('attach-menu');
        if (menu) menu.style.display = 'none';
    }

    attachPhoto() {
        this.hideAttachMenu();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
        input.click();
    }

    attachVideo() {
        this.hideAttachMenu();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
        input.click();
    }

    async recordVideo() {
        this.hideAttachMenu();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.currentFacingMode },
                audio: true
            });
            this.currentStream = stream;
            this.showVideoRecorder(stream);
        } catch (error) {
            telegram.showAlert('Нет доступа к камере');
        }
    }

    showVideoRecorder(stream) {
        const recorder = document.createElement('div');
        recorder.className = 'video-recording';
        recorder.innerHTML = `
            <div class="video-preview">
                <video id="video-preview" autoplay playsinline muted></video>
                <div class="video-controls">
                    <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
                    <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
                    <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
                </div>
            </div>
        `;
        document.body.appendChild(recorder);

        const video = document.getElementById('video-preview');
        video.srcObject = stream;
    }

    async switchCamera() {
        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }
        await this.recordVideo();
    }

    toggleVideoRecording() {
        const btn = document.getElementById('record-btn');
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            this.startVideoRecording();
            btn.classList.add('recording');
        } else {
            this.stopVideoRecording();
            btn.classList.remove('recording');
        }
    }

    startVideoRecording() {
        if (!this.currentStream) return;

        this.mediaRecorder = new MediaRecorder(this.currentStream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
            this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
            const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
            this.handleVideoUpload(videoBlob);
        };

        this.mediaRecorder.start();
    }

    stopVideoRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
    }

    closeVideoRecorder() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        const recorder = document.querySelector('.video-recording');
        if (recorder) recorder.remove();
    }

    async shareScreen() {
        this.hideAttachMenu();
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });
            
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                this.handleVideoUpload(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
        } catch (error) {
            telegram.showAlert('Нет доступа к экрану');
        }
    }

    async handleFileUpload(file, type) {
        if (!file) return;

        this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Upload to backend and get URL
                const imageUrl = e.target.result; // Base64 data URL

                // Call Hermes image analysis
                const response = await fetch('/analyze-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_url: imageUrl,
                        prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
                        user_id: telegram.getUserId(),
                        session_id: `tg_${telegram.getUserId()}`
                    })
                });

                const data = await response.json();

                if (data.response) {
                    this.addChatMessage('hermes', data.response);
                } else if (data.error) {
                    this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
                }
            } catch (error) {
                console.error('[App] Upload error:', error);
                this.addChatMessage('system', '❌ Ошибка загрузки файла');
            }
        };
        reader.readAsDataURL(file);
    }

    async handleVideoUpload(blob) {
        this.addChatMessage('user', '[🎥 Видеозапись]');
        this.closeVideoRecorder();

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const videoUrl = e.target.result;

                // Call Hermes video analysis
                const response = await fetch('/analyze-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_url: videoUrl,
                        prompt: 'Проанализируй это видео',
                        user_id: telegram.getUserId(),
                        session_id: `tg_${telegram.getUserId()}`
                    })
                });

                const data = await response.json();

                if (data.response) {
                    this.addChatMessage('hermes', data.response);
                } else if (data.error) {
                    this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
                }
            } catch (error) {
                console.error('[App] Video upload error:', error);
                this.addChatMessage('system', '❌ Ошибка загрузки видео');
            }
        };
        reader.readAsDataURL(blob);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    async submitFeedback(msgIdx, feedback) {
        const msg = this.chatMessages[msgIdx];
        if (!msg || msg.feedback) return;

        msg.feedback = feedback;
        this.renderChatMessages();

        try {
            const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
                ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
                : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';

            await fetch(baseUrl + 'feedback', {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_id: msgIdx,
                    feedback,
                    user_id: telegram.getUserId(),
                    session_id: `tg_${telegram.getUserId()}`,
                    text: msg.text.substring(0, 200)
                })
            });

            telegram.haptic('light');
        } catch (error) {
            console.error('[Feedback] Error:', error.message);
        }
    }

    updateTaskSpec(title, content) {
        const specContainer = document.getElementById('task-spec');
        const specContent = document.getElementById('task-spec-content');
        if (!specContainer || !specContent) return;

        specContainer.classList.add('has-content');
        specContent.innerHTML = `
            <div class="task-spec-title">${this.escapeHtml(title)}</div>
            <div>${this.escapeHtml(content)}</div>
        `;
    }

    clearTaskSpec() {
        const specContainer = document.getElementById('task-spec');
        const specContent = document.getElementById('task-spec-content');
        if (!specContainer || !specContent) return;

        specContainer.classList.remove('has-content');
        specContent.textContent = 'Ожидание ТЗ от Гермеса...';
    }

    // ─── Голосовой ввод ТЗ ───────────────────────────────────────────────
    initVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[App] SpeechRecognition не поддерживается в этом браузере');
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ru-RU';
        this.recognition.interimResults = true;
        this.recognition.continuous = true;

        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += transcript + ' ';
                else interim += transcript;
            }
            const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
            if (input) {
                input.value = (this._voiceBaseText || '') + final + interim;
            }
        };

        this.recognition.onerror = (e) => console.warn('[App] Voice error:', e.error);
        this.recognition.onend = () => {
            this.isRecording = false;
            const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
            if (micBtn) micBtn.classList.remove('recording');
        };
    }

    toggleVoiceRecording() {
        if (!this.recognition) return telegram.showAlert('Голосовой ввод не поддерживается');
        const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            if (micBtn) micBtn.classList.remove('recording');
        } else {
            const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
            this._voiceBaseText = input ? input.value + ' ' : '';
            this.recognition.start();
            this.isRecording = true;
            if (micBtn) micBtn.classList.add('recording');
            telegram.haptic('light');
        }
    }

    // ─── Панель смарт-контракта (вопросы Гермеса) ────────────────────────
    renderContractQuestions(questions = []) {
        const container = document.getElementById('contract-qa-container');
        if (!container) return;
        container.innerHTML = '';
        if (!questions.length) {
            container.innerHTML = '<div class="qa-empty">Нет активных вопросов от Гермеса</div>';
            return;
        }
        questions.forEach((q, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'qa-item';
            wrap.innerHTML = `
                <div class="qa-question">${idx + 1}. ${this.escapeHtml(q.text)}</div>
                <input type="text" class="qa-answer-input" placeholder="Ваш ответ..." data-qid="${q.id || idx}" />
            `;
            container.appendChild(wrap);
        });
        container.querySelectorAll('.qa-answer-input').forEach(inp => {
            inp.addEventListener('change', () => this.saveContractAnswers());
        });
    }

    saveContractAnswers() {
        const inputs = document.querySelectorAll('.qa-answer-input');
        const answers = {};
        inputs.forEach(inp => answers[inp.dataset.qid] = inp.value.trim());
        this.contractAnswers = answers;
        this.saveCache();
    }

    // ─── История ТЗ ──────────────────────────────────────────────────────
    async saveTaskSpecHistory(specText) {
        if (!specText?.trim()) return;
        const history = this.taskSpecHistory || [];
        history.unshift({ text: specText, timestamp: Date.now() });
        if (history.length > 20) history.pop();
        this.taskSpecHistory = history;
        try {
            if (window.Telegram?.WebApp?.CloudStorage) {
                await new Promise((res, rej) => Telegram.WebApp.CloudStorage.setItem('task_spec_history', JSON.stringify(history), (err, ok) => err ? rej(err) : res(ok)));
            } else {
                localStorage.setItem('task_spec_history', JSON.stringify(history));
            }
        } catch (e) { console.warn('[App] History save failed:', e); }
    }

    async loadTaskSpecHistory() {
        try {
            let raw = null;
            if (window.Telegram?.WebApp?.CloudStorage) {
                raw = await new Promise((res, rej) => Telegram.WebApp.CloudStorage.getItem('task_spec_history', (err, val) => err ? rej(err) : res(val)));
            } else {
                raw = localStorage.getItem('task_spec_history');
            }
            this.taskSpecHistory = raw ? JSON.parse(raw) : [];
        } catch (e) {
            this.taskSpecHistory = [];
        }
        this.renderTaskSpecHistory();
    }

    renderTaskSpecHistory() {
        const list = document.getElementById('task-history-list');
        if (!list) return;
        list.innerHTML = '';
        if (!this.taskSpecHistory?.length) {
            list.innerHTML = '<div class="history-empty">История пуста</div>';
            return;
        }
        this.taskSpecHistory.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'history-item';
            const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            el.innerHTML = `<span class="history-time">${time}</span><span class="history-text">${this.escapeHtml(item.text.slice(0, 60))}...</span>`;
            el.onclick = () => {
                const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
                if (input) input.value = item.text;
                telegram.haptic('light');
            };
            list.appendChild(el);
        });
    }

    // ─── Экспорт ТЗ ──────────────────────────────────────────────────────
    exportTaskSpec() {
        const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
        const spec = input?.value?.trim() || '';
        const answers = this.contractAnswers || {};
        if (!spec && !Object.keys(answers).length) return telegram.showAlert('Нет данных для экспорта');

        const payload = {
            task_spec: spec,
            contract_answers: answers,
            exported_at: new Date().toISOString(),
            user_id: telegram.getUserId?.() || 'unknown'
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task_spec_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        telegram.haptic('success');
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeuroEscrowApp();
    app = window.app;
});

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'bot_data' && app) {
        app.handleBotData(event.data.payload);
    }
});
