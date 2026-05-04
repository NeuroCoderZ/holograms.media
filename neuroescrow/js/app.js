/**
 * NeuroEscrow Hub — Main Application
 * Manages views, data, and user interactions
 */

class NeuroEscrowApp {
    constructor() {
        this.currentView = 'orders';
        this.userData = null;
        this.orders = [];
        this.deals = [];
        this.transactions = [];
        this.balance = 0;
        this.cache = {};
        
        this.init();
    }

    async init() {
        // Load user from Telegram
        this.userData = telegram.getUser();
        this.updateHeader();
        
        // Load cached data
        await this.loadCache();
        
        // Render initial view
        this.navigate('orders');
        
        // Setup event listeners
        window.addEventListener('ton:statusChange', (e) => {
            this.onTonStatusChange(e.detail);
        });
        
        // Request fresh data from bot
        this.requestDataFromBot();
    }

    updateHeader() {
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        
        if (this.userData) {
            const name = this.userData.first_name || this.userData.username || 'Пользователь';
            nameEl.textContent = name;
            roleEl.textContent = 'АКТИВЕН';
        } else {
            nameEl.textContent = 'Гость';
            roleEl.textContent = '—';
        }
    }

    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------

    navigate(view) {
        this.currentView = view;
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Render view
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        
        switch(view) {
            case 'orders':
                this.renderOrdersView(main);
                break;
            case 'deals':
                this.renderDealsView(main);
                break;
            case 'balance':
                this.renderBalanceView(main);
                break;
        }
        
        telegram.haptic('light');
    }

    // -------------------------------------------------------------------------
    // Orders View (Stream + Auction)
    // -------------------------------------------------------------------------

    renderOrdersView(container) {
        const view = document.createElement('div');
        view.className = 'view';
        
        view.innerHTML = `
            <div class="toggle-group">
                <button class="toggle-btn active" onclick="app.setOrderMode('stream')">Поток</button>
                <button class="toggle-btn" onclick="app.setOrderMode('auction')">Аукцион</button>
            </div>
            <div id="orders-list"></div>
        `;
        
        container.appendChild(view);
        this.renderOrdersList('stream');
    }

    setOrderMode(mode) {
        document.querySelectorAll('.toggle-group .toggle-btn').forEach((btn, i) => {
            btn.classList.toggle('active', (mode === 'stream' && i === 0) || (mode === 'auction' && i === 1));
        });
        this.renderOrdersList(mode);
        telegram.haptic('light');
    }

    renderOrdersList(mode) {
        const list = document.getElementById('orders-list');
        if (!list) return;
        
        // Use cached or sample data
        const orders = this.orders.length > 0 ? this.orders : this.getSampleOrders(mode);
        
        if (orders.length === 0) {
            list.innerHTML = this.emptyState('📋', 'Нет доступных заказов');
            return;
        }
        
        list.innerHTML = orders.map(order => this.orderCard(order, mode)).join('');
    }

    orderCard(order, mode) {
        const isStream = mode === 'stream';
        const badgeClass = isStream ? 'badge-stream' : 'badge-auction';
        const badgeText = isStream ? 'ПОТОК' : 'АУКЦИОН';
        const actionBtn = isStream 
            ? `<button class="btn btn-success" onclick="app.takeOrder('${order.id}')">Взять в работу</button>`
            : `<button class="btn btn-primary" onclick="app.bidOrder('${order.id}')">Предложить цену</button>`;
        
        return `
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                    <span style="font-size:13px;color:var(--tg-hint);">${order.date}</span>
                </div>
                <div class="card-title">${order.title}</div>
                <div class="card-subtitle">${order.description}</div>
                <div style="display:flex;gap:12px;margin:12px 0;font-size:14px;">
                    <span>💰 <strong>${order.budget} USDT</strong></span>
                    <span>⏰ ${order.deadline}</span>
                </div>
                ${actionBtn}
            </div>
        `;
    }

    getSampleOrders(mode) {
        if (mode === 'stream') {
            return [
                { id: '1', title: 'Telegram бот для интернет-магазина', description: 'Нужен бот с каталогом, корзиной и оплатой через Stars', budget: '500', deadline: '3 дня', date: '2 мин назад' },
                { id: '2', title: 'Парсер данных с сайта', description: 'Собрать цены и описания товаров с 5 источников', budget: '300', deadline: '5 дней', date: '15 мин назад' },
                { id: '3', title: 'Интеграция LLM API', description: 'Подключить GPT-4 к существующему сервису через FastAPI', budget: '800', deadline: '7 дней', date: '1 час назад' },
            ];
        } else {
            return [
                { id: '4', title: 'Мобильное приложение на Flutter', description: 'Приложение-доставка еды с картами и уведомлениями', budget: '2000', deadline: '14 дней', date: '30 мин назад', bids: 3 },
                { id: '5', title: 'Аудит безопасности смарт-контракта', description: 'Проверить TON контракт на уязвимости', budget: '1500', deadline: '5 дней', date: '2 часа назад', bids: 1 },
            ];
        }
    }

    takeOrder(orderId) {
        telegram.showConfirm('Взять этот заказ в работу?', (confirmed) => {
            if (confirmed) {
                telegram.sendData({ action: 'take_order', order_id: orderId });
                telegram.showAlert('Заявка отправлена! Ожидайте подтверждения клиента.');
                telegram.haptic('heavy');
            }
        });
    }

    bidOrder(orderId) {
        telegram.showAlert('Функция ставок в разработке. Используйте бота для торгов.');
    }

    // -------------------------------------------------------------------------
    // Deals View
    // -------------------------------------------------------------------------

    renderDealsView(container) {
        const view = document.createElement('div');
        view.className = 'view';
        
        const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
        
        view.innerHTML = `
            <h2 style="font-size:18px;margin-bottom:16px;">Мои сделки</h2>
            ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
            <div id="deals-list">
                ${deals.map(deal => this.dealCard(deal)).join('')}
            </div>
        `;
        
        container.appendChild(view);
    }

    dealCard(deal) {
        const statusColors = {
            'incoming': '#ff9500',
            'negotiating': '#007aff',
            'funded': '#34c759',
            'in_progress': '#5856d6',
            'delivered': '#af52de',
            'accepted': '#34c759',
            'dispute': '#ff3b30',
            'refunded': '#8e8e93'
        };
        
        const statusNames = {
            'incoming': 'Новая',
            'negotiating': 'Переговоры',
            'funded': 'Оплачена',
            'in_progress': 'В работе',
            'delivered': 'На проверке',
            'accepted': 'Завершена',
            'dispute': 'Спор',
            'refunded': 'Возврат'
        };
        
        const color = statusColors[deal.status] || '#8e8e93';
        const statusName = statusNames[deal.status] || deal.status;
        
        return `
            <div class="card" style="border-left:4px solid ${color};">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:13px;font-weight:600;color:${color};">${statusName}</span>
                    <span style="font-size:12px;color:var(--tg-hint);">#${deal.id}</span>
                </div>
                <div class="card-title">${deal.title}</div>
                <div style="display:flex;gap:16px;margin-top:12px;font-size:14px;">
                    <span>💰 ${deal.budget} USDT</span>
                    <span>👤 ${deal.counterparty}</span>
                </div>
                <div style="margin-top:12px;">
                    <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Подробнее</button>
                </div>
            </div>
        `;
    }

    getSampleDeals() {
        return [
            { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
            { id: 'c3d4', title: 'Парсер данных с сайта', status: 'accepted', budget: '300', counterparty: 'client_17' },
            { id: 'e5f6', title: 'Интеграция LLM API', status: 'dispute', budget: '800', counterparty: 'client_91' },
        ];
    }

    viewDeal(dealId) {
        telegram.sendData({ action: 'view_deal', deal_id: dealId });
        telegram.showAlert('Открываю детали сделки в боте...');
    }

    // -------------------------------------------------------------------------
    // Balance View
    // -------------------------------------------------------------------------

    renderBalanceView(container) {
        const view = document.createElement('div');
        view.className = 'view';
        
        const txData = this.transactions.length > 0 ? this.transactions : this.getSampleTransactions();
        const chartData = charts.generateSampleData('week');
        const typeData = charts.generateSampleTypes();
        
        view.innerHTML = `
            <div class="balance-header">
                <div class="balance-amount">${this.balance.toFixed(2)} USDT</div>
                <div class="balance-label">Ваш баланс</div>
            </div>
            
            <div id="ton-connect" style="margin-bottom:16px;"></div>
            
            <div class="card">
                <div class="card-title">Доходы и расходы</div>
                <div class="toggle-group" style="margin-bottom:12px;">
                    <button class="toggle-btn active" onclick="app.setChartPeriod('week')">Неделя</button>
                    <button class="toggle-btn" onclick="app.setChartPeriod('month')">Месяц</button>
                </div>
                <div class="chart-container">
                    <canvas id="balance-chart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">Распределение</div>
                <div class="chart-container" style="height:180px;">
                    <canvas id="type-chart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div class="card-title" style="margin:0;">История транзакций</div>
                </div>
                <div class="filter-row">
                    <button class="filter-chip active" onclick="app.filterTx('all')">Все</button>
                    <button class="filter-chip" onclick="app.filterTx('deposit')">Пополнения</button>
                    <button class="filter-chip" onclick="app.filterTx('withdraw')">Выплаты</button>
                    <button class="filter-chip" onclick="app.filterTx('escrow')">Эскроу</button>
                </div>
                <div id="tx-list">
                    ${this.renderTxList(txData)}
                </div>
            </div>
        `;
        
        container.appendChild(view);
        
        // Init TON Connect
        setTimeout(() => {
            tonConnect.init('ton-connect');
        }, 100);
        
        // Render charts
        setTimeout(() => {
            charts.renderBalanceChart('balance-chart', chartData);
            charts.renderTypeChart('type-chart', typeData);
        }, 200);
    }

    setChartPeriod(period) {
        document.querySelectorAll('.toggle-group .toggle-btn').forEach((btn, i) => {
            btn.classList.toggle('active', (period === 'week' && i === 0) || (period === 'month' && i === 1));
        });
        
        const data = charts.generateSampleData(period);
        charts.renderBalanceChart('balance-chart', data);
        telegram.haptic('light');
    }

    renderTxList(transactions) {
        if (transactions.length === 0) {
            return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Нет транзакций</div></div>';
        }
        
        return transactions.map(tx => `
            <div class="tx-item">
                <div class="tx-info">
                    <div class="tx-type">${tx.type}</div>
                    <div class="tx-date">${tx.date}</div>
                </div>
                <div class="tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
                    ${tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(2)} USDT
                </div>
            </div>
        `).join('');
    }

    filterTx(type) {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', 
                (type === 'all' && chip.textContent === 'Все') ||
                (type === 'deposit' && chip.textContent === 'Пополнения') ||
                (type === 'withdraw' && chip.textContent === 'Выплаты') ||
                (type === 'escrow' && chip.textContent === 'Эскроу')
            );
        });
        
        const allTx = this.transactions.length > 0 ? this.transactions : this.getSampleTransactions();
        const filtered = type === 'all' ? allTx : allTx.filter(tx => tx.type.toLowerCase().includes(type));
        
        const list = document.getElementById('tx-list');
        if (list) {
            list.innerHTML = this.renderTxList(filtered);
        }
        
        telegram.haptic('light');
    }

    getSampleTransactions() {
        return [
            { type: 'Пополнение через Stars', amount: 70.00, date: '01.05.2026 14:30' },
            { type: 'Выплата по сделке #a1b2', amount: -500.00, date: '30.04.2026 18:15' },
            { type: 'Пополнение через TON', amount: 150.00, date: '28.04.2026 09:45' },
            { type: 'Эскроу-депозит', amount: -200.00, date: '27.04.2026 16:20' },
            { type: 'Возврат по спору', amount: 80.00, date: '25.04.2026 11:00' },
            { type: 'Комиссия платформы', amount: -15.00, date: '24.04.2026 20:10' },
        ];
    }

    onTonStatusChange(detail) {
        console.log('[App] TON status changed:', detail);
        // Could update UI here
    }

    // -------------------------------------------------------------------------
    // Data Management
    // -------------------------------------------------------------------------

    async loadCache() {
        try {
            const cached = await telegram.cloudGet('neuroescrow_data');
            if (cached) {
                this.orders = cached.orders || [];
                this.deals = cached.deals || [];
                this.transactions = cached.transactions || [];
                this.balance = cached.balance || 0;
                console.log('[App] Cache loaded');
            }
        } catch (e) {
            console.log('[App] No cache found');
        }
    }

    async saveCache() {
        const data = {
            orders: this.orders,
            deals: this.deals,
            transactions: this.transactions,
            balance: this.balance,
            timestamp: Date.now()
        };
        await telegram.cloudSet('neuroescrow_data', data);
    }

    requestDataFromBot() {
        // Request fresh data from bot
        telegram.sendData({ action: 'get_dashboard_data' });
    }

    handleBotData(data) {
        console.log('[App] Data from bot:', data);
        
        if (data.orders) this.orders = data.orders;
        if (data.deals) this.deals = data.deals;
        if (data.transactions) this.transactions = data.transactions;
        if (data.balance !== undefined) this.balance = data.balance;
        
        this.saveCache();
        
        // Refresh current view
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        switch(this.currentView) {
            case 'orders': this.renderOrdersView(main); break;
            case 'deals': this.renderDealsView(main); break;
            case 'balance': this.renderBalanceView(main); break;
        }
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    emptyState(icon, text) {
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <div class="empty-text">${text}</div>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NeuroEscrowApp();
});

// Handle data from bot (via postEvent)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'bot_data' && app) {
        app.handleBotData(event.data.payload);
    }
});
