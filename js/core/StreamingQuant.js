/**
 * StreamingQuant.js
 * Слой когнитивного квантования жестов (200ms ticks).
 * Анализирует расстояние между большим и указательным пальцами для детекции "Щипка" (Pinch).
 */
export class StreamingQuant {
    constructor(eventBus, state) {
        this.eventBus = eventBus;
        this.state = state;
        this.lastDetection = 0;
        this.pinchThreshold = 0.05; // Порог расстояния для щипка
        this.tickRate = 200; // 200ms квант
        this.isPinching = false;
        this.pinchStartTime = 0;

        this.init();
    }

    init() {
        this.eventBus.on('handsUpdate', (data) => this.analyze(data));
    }

    analyze(data) {
        const now = performance.now();
        if (now - this.lastDetection < this.tickRate) return;
        this.lastDetection = now;

        if (!data || !data.landmarks) return;

        data.landmarks.forEach((landmarks, index) => {
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            if (thumbTip && indexTip) {
                const distance = Math.sqrt(
                    Math.pow(thumbTip.x - indexTip.x, 2) +
                    Math.pow(thumbTip.y - indexTip.y, 2) +
                    Math.pow(thumbTip.z - indexTip.z, 2)
                );

                const currentPinch = distance < this.pinchThreshold;

                if (currentPinch && !this.isPinching) {
                    this.isPinching = true;
                    this.pinchStartTime = now;
                    this.eventBus.emit('gesture:pinchStarted', { hand: data.handedness[index] });
                    console.log("[StreamingQuant] Pinch Detected!");
                } else if (!currentPinch && this.isPinching) {
                    this.isPinching = false;
                    const duration = now - this.pinchStartTime;
                    this.eventBus.emit('gesture:pinchEnded', { 
                        hand: data.handedness[index],
                        duration: duration
                    });
                }
            }
        });
    }
}
