// frontend/js/ai/gestureIntentClassifier.js

/**
 * Имитирует работу легковесной ML-модели для классификации намерения жеста.
 * В будущем будет заменен на реальную модель TensorFlow.js/ONNX.
 */
export class GestureIntentClassifier {
  constructor() {
    console.log("GestureIntentClassifier: Инициализирован (режим заглушки).");
    this.lastIntent = null;
    this.lastIntentTime = 0;
    this.debounceTime = 500; // 500ms debounce для предотвращения спама
  }

  /**
   * Предсказывает намерение на основе данных о жесте.
   * @param {object} landmarks - Данные о ключевых точках от MediaPipe.
   * @returns {Promise<string|null>} Строка с намерением или null, если жест не изменился или не распознан.
   */
  async predict(landmarks) {
    if (!landmarks || landmarks.length < 21) return null; // Убедимся, что есть все 21 точки

    let currentIntent = null;
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Проверяем, что все необходимые точки существуют
    if (!thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip ||
        !landmarks[2] || !landmarks[1] || // For thumb extension
        !landmarks[6] || !landmarks[5] || // For index extension
        !landmarks[10] || !landmarks[9] || // For middle extension
        !landmarks[14] || !landmarks[13] || // For ring extension
        !landmarks[18] || !landmarks[17]    // For pinky extension
       ) {
      // console.warn("GestureIntentClassifier: Недостаточно данных о ключевых точках для предсказания.");
      return null;
    }

    const index_thumb_dist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y, indexTip.z - thumbTip.z); // Используем 3D расстояние

    // Эвристика для "щипка" или "выбора"
    if (index_thumb_dist < 0.05) { // Условное пороговое значение (может потребовать подстройки)
         currentIntent = 'select';
    }
    // Эвристика для "открытой ладони" (навигация)
    else if (
        this.isFingerExtended(thumbTip, landmarks[2], landmarks[1]) &&
        this.isFingerExtended(indexTip, landmarks[6], landmarks[5]) &&
        this.isFingerExtended(middleTip, landmarks[10], landmarks[9]) &&
        this.isFingerExtended(ringTip, landmarks[14], landmarks[13]) && // Добавим проверку и для остальных пальцев
        this.isFingerExtended(pinkyTip, landmarks[18], landmarks[17])
    ) {
        currentIntent = 'navigate';
    }
    // Эвристика для "кулака" (захват/перемещение)
    else if (
        // Проверяем, что все пальцы, кроме большого, согнуты
        // (большой палец может быть как согнут, так и выпрямлен при жесте "кулак")
        !this.isFingerExtended(indexTip, landmarks[6], landmarks[5]) &&
        !this.isFingerExtended(middleTip, landmarks[10], landmarks[9]) &&
        !this.isFingerExtended(ringTip, landmarks[14], landmarks[13]) &&
        !this.isFingerExtended(pinkyTip, landmarks[18], landmarks[17])
    ) {
        currentIntent = 'grab';
    }


    // Debounce: возвращаем намерение, только если оно изменилось или прошло достаточно времени
    const now = Date.now();
    if (currentIntent && (currentIntent !== this.lastIntent || now - this.lastIntentTime > this.debounceTime)) {
        this.lastIntent = currentIntent;
        this.lastIntentTime = now;
        // console.log(`GestureIntentClassifier: Detected intent - ${currentIntent}`);
        return currentIntent;
    }

    // Если currentIntent не null, но не прошел debounce, мы не сбрасываем lastIntent,
    // чтобы при следующем вызове, если currentIntent тот же, он все равно прошел debounce по времени.
    // Если currentIntent стал null (жест не распознан), то мы можем сбросить lastIntent, чтобы
    // следующее распознавание любого жеста сразу сработало.
    if (currentIntent === null && this.lastIntent !== null && (now - this.lastIntentTime > this.debounceTime / 2) ) {
        // console.log(`GestureIntentClassifier: Intent lost, resetting lastIntent from ${this.lastIntent}`);
        this.lastIntent = null; // Позволит следующему жесту сработать быстрее
    }


    return null;
  }

  // Вспомогательная функция для определения, выпрямлен ли палец
  // Y-координата уменьшается вверх (к кончикам пальцев, если ладонь смотрит на камеру)
  isFingerExtended(tip, pip, mcp) {
      if (!tip || !pip || !mcp) return false;
      // Палец выпрямлен, если его суставы в основном на одной линии,
      // и кончик (tip) находится "выше" (меньшее значение Y), чем средний сустав (pip),
      // а средний сустав (pip) "выше", чем основной сустав (mcp).
      // Также добавляем проверку на Z-координату, чтобы убедиться, что палец направлен к камере
      const yStraight = tip.y < pip.y && pip.y < mcp.y;
      // Проверка, что палец не согнут в сторону ладони сильно по оси Z
      // (предполагаем, что mcp.z - это база, pip.z и tip.z должны быть меньше или равны для выпрямленного пальца)
      // Это очень грубая эвристика для Z, может потребовать доработки.
      const zStraight = (tip.z <= pip.z + 0.03) && (pip.z <= mcp.z + 0.03); // Допуск на небольшое отклонение
      return yStraight && zStraight;
  }
}
