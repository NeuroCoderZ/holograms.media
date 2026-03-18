/**
 * js/ui/treasuryUI.js
 * Controller for the Obolos Treasury Modal.
 * Listens to wallet and DAO events to update the UI in real-time.
 */

export function initializeTreasuryUI() {
    const balanceEl = document.getElementById('obolos-balance');
    const blockCountEl = document.getElementById('treasury-block-count');
    const utilityStatusEl = document.getElementById('dao-utility-status');

    if (!balanceEl) return;

    // 1. Listen for wallet updates (Obolos balance)
    window.addEventListener('tria:wallet_updated', (event) => {
        const { balance } = event.detail;
        if (balanceEl) {
            balanceEl.innerText = balance.toFixed(6);
        }
    });

    // 2. Listen for DAO score updates
    window.addEventListener('tria:dao_score_updated', (event) => {
        const { score } = event.detail;
        if (utilityStatusEl) {
            updateUtilityStatus(utilityStatusEl, score);
        }
    });

    // 3. Initial state poll (if wallet already has data)
    import('../tria/HermaionWallet.js').then(m => {
        if (m.hermaionWallet && balanceEl) {
            balanceEl.innerText = m.hermaionWallet.obolosBalance.toFixed(6);
        }
    });
}

function updateUtilityStatus(el, score) {
    let statusText = "🙂 Новичок";
    let color = "#00ff88";

    if (score > 90) {
        statusText = "👑 Архитектор";
        color = "#ff00ff";
    } else if (score > 75) {
        statusText = "💎 Валидатор";
        color = "#00ccff";
    } else if (score > 60) {
        statusText = "🛠️ Контрибьютор";
        color = "#ffff00";
    } else if (score < 30) {
        statusText = "⚠️ Деградант";
        color = "#ff4444";
    }

    el.innerText = statusText;
    el.style.color = color;
}
