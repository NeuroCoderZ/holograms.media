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
        
        this.init();
    }

    async init() {
        this.userData = telegram.getUser();
        this.updateHeader();
        await this.loadCache();
        this.navigate('hermes');
        
        window.addEventListener('ton:statusChange', (e) => {
            this.onTonStatusChange(e.detail);
        });
        
        this.requestDataFromBot();
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
        view.className = 'view';
        
        view.innerHTML = `
            <div class="voice-interface">
                <button class="voice-button" id="voice-btn" onclick="app.toggleVoice()">
                    <span class="voice-icon">🎙️</span>
                </button>
                <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Гермес</div>
                <div class="voice-hint">Нажмите и говорите</div>
                <div class="voice-status" id="voice-status"></div>
                <div style="font-size:13px;color:var(--ne-light-gray);margin-top:24px;max-width:300px;">
                    Опишите задачу голосом. Гермес поможет сформулировать и найдёт подходящего нейрокодера.
                </div>
            </div>
        `;
        
        container.appendChild(view);
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
            // Try native Telegram voice recording (Bot API 9.6+)
            if (typeof tg.requestVoiceMessage === 'function') {
                const result = await tg.requestVoiceMessage();
                
                if (result && result.file_id) {
                    this.sendVoiceToBot(result.file_id, result.duration);
                } else {
                    throw new Error('No file_id received');
                }
            } else {
                // Fallback to manual recording
                this.fallbackToManualRecording();
            }
        } catch (error) {
            console.error('[NeuroEscrow] Voice recording failed:', error);
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
        
        if (!btn || !status) return;
        
        // Remove all state classes
        btn.classList.remove('recording', 'processing');
        
        switch (this.voiceState) {
            case 'IDLE':
                status.textContent = '';
                status.style.display = 'none';
                this.isRecording = false;
                break;
                
            case 'LISTENING':
                btn.classList.add('recording');
                status.textContent = 'Слушаю...';
                status.style.display = 'block';
                this.isRecording = true;
                break;
                
            case 'PROCESSING':
                btn.classList.add('processing');
                status.textContent = 'Гермес обрабатывает...';
                status.style.display = 'block';
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
            timestamp: Date.now()
        };
        await telegram.cloudSet('neuroescrow_data', data);
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
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NeuroEscrowApp();
});

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'bot_data' && app) {
        app.handleBotData(event.data.payload);
    }
});
