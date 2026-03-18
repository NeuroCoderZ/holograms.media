/**
 * js/tria/HermaionWallet.js
 * Hermaion: Agentic Wallet Interface (Mock / Simulation).
 * 
 * Purpose: Manage 'Obolos' capability tokens and simulate crypto-transactions.
 * Future: Integrate with Coinbase SDK / Solana for real value transfer.
 */

import { state } from '../core/init.js';

export class HermaionWallet {
    constructor() {
        this.address = "0xHermaion_Tria_Agent_Wallet_Mock";
        this.obolosBalance = 0.0;
        this.transactions = [];
        this.isConnected = false;
    }

    async connect() {
        // Simulation of wallet connection
        console.log(`[Hermaion] Connecting to wallet...`);
        await new Promise(r => setTimeout(r, 800));
        this.isConnected = true;
        console.log(`[Hermaion] Wallet Connected: ${this.address}`);
        return this.address;
    }

    async getBalance() {
        const userId = state.user ? (state.user.user_id || state.user.id) : "guest_user";

        try {
            const response = await fetch(`/api/v1/wallet/obolos/balance/${userId}`);
            if (response.ok) {
                const data = await response.json();
                this.obolosBalance = data.obolos_balance;
            }
        } catch (err) {
            console.warn(`[Hermaion] Failed to fetch balance from server, using local fallback.`, err);
            if (state.user && state.user.obolos_balance !== undefined) {
                this.obolosBalance = state.user.obolos_balance;
            }
        }
        return this.obolosBalance;
    }

    /**
     * Зачисляет Obolos на основе количества жестов (Secure Server-side calculation).
     * @param {number} gestureCount - Количество накопленных жестов.
     */
    async earn(gestureCount) {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            console.warn('[Hermaion] Earning postponed: No JWT token found.');
            return false;
        }

        try {
            const response = await fetch('/api/v1/wallet/obolos/earn', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ gesture_count: gestureCount })
            });

            if (response.ok) {
                const data = await response.json();
                this.obolosBalance = data.new_balance;
                this._recordTx('received', data.reward, 'Tria Compute');
                console.log(`[Hermaion] Obolos Earned: ${data.reward}. New Balance: ${this.obolosBalance}`);
                return true;
            } else {
                const errData = await response.json();
                console.error(`[Hermaion] Earn Failed: ${errData.detail}`);
            }
        } catch (err) {
            console.error(`[Hermaion] Network Error during earn:`, err);
        }
        return false;
    }

    /**
     * @deprecated Метод pay требует безопасной реализации через подписи на бэкенде.
     */
    async pay(amount, service) {
        console.error('[Hermaion] Direct pay is disabled for security. Use signed transactions.');
        return false;
    }

    _recordTx(type, amount, entity) {
        this.transactions.push({
            type,
            amount,
            entity,
            timestamp: Date.now(),
            hash: "0x" + Math.random().toString(16).slice(2)
        });

        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('tria:wallet_updated', {
            detail: { 
                balance: this.obolosBalance,
                type,
                amount,
                entity
            }
        }));
    }
}

export const hermaionWallet = new HermaionWallet();
