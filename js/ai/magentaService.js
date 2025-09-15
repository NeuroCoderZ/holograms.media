import * as mm from '@magenta/music';

/**
 * Сервис для взаимодействия с Magenta.js, в частности с MusicVAE.
 */
export class MagentaService {
    constructor() {
        this.model = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
        this.player = new mm.Player();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        try {
            await this.model.initialize();
            console.log("MagentaService: MusicVAE модель инициализирована.");
            this.isInitialized = true;
        } catch (error) {
            console.error("MagentaService: Ошибка инициализации модели.", error);
        }
    }

    /**
     * Модифицирует базовый латентный вектор.
     * @param {Array<number>} baseVector - Исходный вектор.
     * @param {Array<number>} deltaVector - Вектор изменения.
     * @returns {Array<number>} Новый латентный вектор.
     */
    modifyLatentVector(baseVector, deltaVector) {
        // Простое сложение векторов для MVP
        return baseVector.map((val, i) => val + deltaVector[i]);
    }

    /**
     * Генерирует NoteSequence из латентного вектора.
     * @param {Array<number>} latentVector - Латентный вектор состояния.
     * @returns {Promise<mm.NoteSequence>}
     */
    async generateNotes(latentVector) {
        if (!this.isInitialized) {
            console.error("MagentaService: Модель не инициализирована.");
            return null;
        }
        try {
            // Генерируем 1 семпл (музыкальную фразу)
            const results = await this.model.decode(tf.tensor([latentVector]), 0.7);
            return results[0];
        } catch (error) {
            console.error("MagentaService: Ошибка при генерации нот.", error);
            return null;
        }
    }
}
