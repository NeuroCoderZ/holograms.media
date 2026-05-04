/**
 * TON Connect Integration
 * Handles wallet connection and payments in TON
 */

class TONConnectIntegration {
    constructor() {
        this.connector = null;
        this.wallet = null;
        this.connected = false;
    }

    /**
     * Initialize TON Connect UI
     */
    init(containerId = 'ton-connect') {
        if (!window.TON_CONNECT_UI) {
            console.error('[TON] TON_CONNECT_UI not loaded');
            return false;
        }

        this.connector = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://neuroescrow.holograms.media/tonconnect-manifest.json',
            buttonRootId: containerId
        });

        // Listen for connection status
        this.connector.onStatusChange((wallet) => {
            this.wallet = wallet;
            this.connected = !!wallet;
            
            if (wallet) {
                console.log('[TON] Wallet connected:', wallet.account.address);
                telegram.haptic('medium');
            } else {
                console.log('[TON] Wallet disconnected');
            }
            
            // Dispatch event for app
            window.dispatchEvent(new CustomEvent('ton:statusChange', { 
                detail: { connected: this.connected, wallet: this.wallet } 
            }));
        });

        return true;
    }

    /**
     * Check if wallet is connected
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get wallet address
     */
    getAddress() {
        return this.wallet ? this.wallet.account.address : null;
    }

    /**
     * Disconnect wallet
     */
    async disconnect() {
        if (this.connector) {
            await this.connector.disconnect();
        }
    }

    /**
     * Send TON payment
     */
    async sendPayment(address, amountTon, comment = '') {
        if (!this.connected) {
            telegram.showAlert('Сначала подключите TON кошелек');
            return null;
        }

        try {
            const result = await this.connector.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                messages: [
                    {
                        address: address,
                        amount: (amountTon * 1e9).toString(), // Convert to nanotons
                        payload: comment ? btoa(comment) : undefined
                    }
                ]
            });
            
            console.log('[TON] Payment sent:', result);
            telegram.haptic('heavy');
            return result;
        } catch (e) {
            console.error('[TON] Payment failed:', e);
            telegram.showAlert('Ошибка оплаты: ' + e.message);
            return null;
        }
    }

    /**
     * Create payment request (for escrow)
     */
    async createEscrowPayment(escrowAddress, amountTon, dealId) {
        const comment = `NeuroEscrow Deal #${dealId}`;
        return this.sendPayment(escrowAddress, amountTon, comment);
    }
}

// Singleton instance
const tonConnect = new TONConnectIntegration();
