/**
 * js/services/AttentionEconomyManager.js
 * Manages the frontend logic for Attention Token rewards,
 * updates the UI balance, and shows reward notifications.
 */
import eventBus from '../core/eventBus.js';

export class AttentionEconomyManager {
    constructor(state) {
        this.state = state;
        this.balance = 0;
        this.balanceElement = null;

        // Listen for snapshot responses from the backend
        // Note: TriaEvolutionConnector flushes data and we need to catch the response
    }

    /**
     * Initializes the UI reference for the token balance.
     */
    initUI() {
        this.balanceElement = document.getElementById('at-balance-display');
        if (!this.balanceElement) {
            console.warn('[AttentionEconomy] Balance display element not found.');
        }
        this.updateDisplay();
    }

    /**
     * Updates the local balance and UI display.
     * @param {number} newBalance - The updated balance from the backend.
     * @param {number} reward - The last reward amount.
     */
    updateBalance(newBalance, reward) {
        this.balance = newBalance;
        this.updateDisplay();

        if (reward > 0) {
            this.showRewardToast(reward);
        }
    }

    /**
     * Updates the text content of the balance display.
     */
    updateDisplay() {
        if (this.balanceElement) {
            this.balanceElement.textContent = `${this.balance.toFixed(2)} AT`;

            // Add a brief "pulse" effect on change
            this.balanceElement.classList.add('pulse-highlight');
            setTimeout(() => this.balanceElement.classList.remove('pulse-highlight'), 500);
        }
    }

    /**
     * Shows a brief non-intrusive notification for the reward.
     */
    showRewardToast(amount) {
        const toast = document.createElement('div');
        toast.className = 'at-reward-toast';
        toast.innerHTML = `<span class="at-icon">✨</span> +${amount.toFixed(2)} AT`;

        // Position near the Tria button or bottom left
        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            leftPanel.appendChild(toast);
        } else {
            document.body.appendChild(toast);
        }

        // Cleanup after animation
        setTimeout(() => toast.remove(), 2500);
    }
}
