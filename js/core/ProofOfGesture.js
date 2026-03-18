/**
 * js/core/ProofOfGesture.js
 * 
 * Модуль Proof-of-Gesture (PoG) для PQC Блокчейна.
 * Отвечает за:
 * 1. Формирование блоков жестов (Soma Blocks).
 * 2. Хеширование блоков алгоритмом ML-DSA (CRYSTALS-Dilithium) - пока используется мок PQC-хэша до интеграции WASM liboqs.
 * 3. Расчет ценности блока на основе активных P2P связей (Chain Responsibility).
 */

export class ProofOfGesture {
    constructor() {
        this.chain = [];
        this.activeConnections = 0;
    }

    /**
     * Формирует бесплатный контейнер-плагин (Блок) из сырых данных.
     * @param {Float32Array} gestureDna - Эмбеддинг жеста (128-dim)
     * @param {Object} metadata - Метаданные (аудио, контекст)
     * @param {number} p2pConnections - Количество активных зрителей/связей в моменте
     * @returns {Object} Сформированный блок
     */
    createSomaBlock(gestureDna, metadata, p2pConnections) {
        this.activeConnections = p2pConnections;
        
        const block = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            dna: gestureDna ? Array.from(gestureDna) : null,
            metadata: metadata,
            connections: this.activeConnections,
            previousHash: this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : "GENESIS_BLOCK",
            // Ценность блока = число активных связей в реальном времени. Больше связей → меньше дробность → выше ценность.
            utilityValue: (this.activeConnections > 0) ? (this.activeConnections * 1.5) : 0.1,
            hash: null,
            signature_algo: "ML-DSA" // Post-Quantum Cryptography target
        };

        block.hash = this._generatePQCHashMock(block);
        this.chain.push(block);

        // Ограничиваем локальную цепочку для экономии памяти (Lethe возьмет на себя обрезку)
        if (this.chain.length > 100) {
            this.chain.shift();
        }

        return block;
    }

    /**
     * Временный мок PQC (Post-Quantum Cryptography) хэширования.
     * В финальной версии (Phase 8 full) это будет вызов WASM модуля liboqs для CRYSTALS-Dilithium.
     * @param {Object} block 
     * @returns {string} 
     */
    _generatePQCHashMock(block) {
        // Простая имитация сильного сжатия для Proof of Concept
        const payload = `${block.id}${block.timestamp}${block.utilityValue}${block.previousHash}`;
        let hash = 0;
        for (let i = 0; i < payload.length; i++) {
            const char = payload.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; 
        }
        return `pqc_mldsa_${Math.abs(hash).toString(16).padStart(16, '0')}`;
    }

    /**
     * Проверяет целостность цепочки "цепной ответственности".
     * При невозврате compute-долга, ноды с максимальной связью помогают покрыть долг.
     */
    verifyChainIntegrity() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.error(`PoG Chain Error: Hash mismatch at block ${currentBlock.id}`);
                return false;
            }
        }
        return true;
    }
}

export const proofOfGesture = new ProofOfGesture();
