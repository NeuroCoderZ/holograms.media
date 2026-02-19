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
     * Simulate paying for a service (e.g., using an LLM API).
     * @param {number} amount - Cost in Obolos.
     * @param {string} service - Service name.
     */
    async pay(amount, service) {
        if (!this.isConnected) await this.connect();

        if (this.obolosBalance < amount) {
            console.error(`[Hermaion] Insufficient Obolos for ${service}. Required: ${amount}, Has: ${this.obolosBalance}`);
            return false;
        }

        // Sync with backend (AstraDB)
        const userId = state.user ? (state.user.user_id || state.user.id) : "guest_user";
        try {
            const response = await fetch('/api/v1/wallet/obolos/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, amount: -amount })
            });

            if (response.ok) {
                const data = await response.json();
                this.obolosBalance = data.new_balance;
                this._recordTx('sent', amount, service);
                console.log(`[Hermaion] Backend Sync Success. New Balance: ${this.obolosBalance}`);
                return true;
            }
        } catch (err) {
            console.error(`[Hermaion] Backend Sync Failed:`, err);
        }

        // Optimistic update fallback if backend fails but we want to continue? 
        // Better to return false to prevent "ghost" payments.
        return false;
    }

    /**
     * Simulate earning Obolos (e.g., for valid gestures/data).
     * @param {number} amount 
     * @param {string} source 
     */
    async earn(amount, source) {
        if (!this.isConnected) await this.connect();

        const userId = state.user ? (state.user.user_id || state.user.id) : "guest_user";
        try {
            const response = await fetch('/api/v1/wallet/obolos/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, amount: amount })
            });

            if (response.ok) {
                const data = await response.json();
                this.obolosBalance = data.new_balance;
                this._recordTx('received', amount, source);
                console.log(`[Hermaion] Earned ${amount} Obolos from ${source}. New Balance: ${this.obolosBalance}`);
                return true;
            }
        } catch (err) {
            console.error(`[Hermaion] Failed to sync earning to backend:`, err);
        }
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
    }
}

export const hermaionWallet = new HermaionWallet();
