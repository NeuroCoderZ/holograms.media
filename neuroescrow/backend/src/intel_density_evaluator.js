/**
 * IntelDensityEvaluator — Модуль оценки интеллектуальной плотности задач
 * 
 * Оценивает сложность и качество работы для расчёта коэффициента ρ_intel
 * в формуле начисления токенов $NEURO.
 * 
 * Формула: ρ_intel = f(сложность, качество, оптимизация, инновации)
 * Диапазон: 0.5 - 3.0 (50-300 в basis points)
 */

export class IntelDensityEvaluator {
  constructor() {
    this.weights = {
      complexity: 0.35,    // Сложность задачи
      quality: 0.30,       // Качество выполнения
      optimization: 0.20,  // Оптимизация кода/решения
      innovation: 0.15     // Инновационность подхода
    };
  }

  /**
   * Главная функция оценки интеллектуальной плотности
   * @param {Object} taskData - Данные о выполненной задаче
   * @returns {number} Коэффициент ρ_intel (0.5 - 3.0)
   */
  async evaluate(taskData) {
    const {
      llmTokensUsed,      // Токены LLM, затраченные на задачу
      taskComplexity,     // Оценка сложности (1-10)
      codeQuality,        // Оценка качества кода (1-10)
      optimizationScore,  // Оценка оптимизации (1-10)
      innovationScore,    // Оценка инновационности (1-10)
      efficiencyRatio     // Эффективность (output/input токенов)
    } = taskData;

    // 1. Базовая оценка по весам
    let baseScore = 
      taskComplexity * this.weights.complexity +
      codeQuality * this.weights.quality +
      optimizationScore * this.weights.optimization +
      innovationScore * this.weights.innovation;

    // 2. Корректировка на эффективность
    // Если задача решена малым числом токенов (высокая эффективность) → бонус
    let efficiencyBonus = 1.0;
    if (efficiencyRatio > 2.0) {
      efficiencyBonus = 1.2; // +20% за высокую эффективность
    } else if (efficiencyRatio > 1.5) {
      efficiencyBonus = 1.1; // +10%
    } else if (efficiencyRatio < 0.5) {
      efficiencyBonus = 0.8; // -20% за низкую эффективность
    }

    // 3. Корректировка на сложность задачи
    // Сложные задачи получают дополнительный множитель
    let complexityMultiplier = 1.0;
    if (taskComplexity >= 8) {
      complexityMultiplier = 1.3; // +30% для очень сложных задач
    } else if (taskComplexity >= 6) {
      complexityMultiplier = 1.15; // +15% для сложных задач
    }

    // 4. Финальный расчёт ρ_intel
    let rhoIntel = (baseScore / 10) * efficiencyBonus * complexityMultiplier;

    // 5. Ограничение диапазона [0.5, 3.0]
    rhoIntel = Math.max(0.5, Math.min(3.0, rhoIntel));

    return {
      rhoIntel,                    // Финальный коэффициент
      baseScore,                   // Базовая оценка
      efficiencyBonus,             // Бонус за эффективность
      complexityMultiplier,        // Множитель сложности
      breakdown: {                 // Детализация для прозрачности
        complexity: taskComplexity * this.weights.complexity,
        quality: codeQuality * this.weights.quality,
        optimization: optimizationScore * this.weights.optimization,
        innovation: innovationScore * this.weights.innovation
      }
    };
  }

  /**
   * Оценка эффективности использования токенов LLM
   * @param {number} inputTokens - Входные токены
   * @param {number} outputTokens - Выходные токены
   * @param {number} taskValue - Полезная ценность результата (1-10)
   * @returns {number} Коэффициент эффективности
   */
  calculateEfficiency(inputTokens, outputTokens, taskValue) {
    const totalTokens = inputTokens + outputTokens;
    
    // Эффективность = (Ценность результата) / (Затраченные токены)
    // Нормализуем к диапазону 0.1 - 5.0
    let efficiency = (taskValue * 100) / totalTokens;
    
    // Ограничиваем диапазон
    return Math.max(0.1, Math.min(5.0, efficiency));
  }

  /**
   * Оценка качества кода через статический анализ
   * @param {string} code - Исходный код
   * @returns {number} Оценка качества (1-10)
   */
  evaluateCodeQuality(code) {
    let score = 5.0; // Базовая оценка

    // 1. Проверка на наличие комментариев
    const commentRatio = (code.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || []).length / code.split('\n').length;
    if (commentRatio > 0.2) score += 1.0;
    else if (commentRatio > 0.1) score += 0.5;

    // 2. Проверка на дублирование кода
    const lines = code.split('\n').filter(l => l.trim());
    const uniqueLines = new Set(lines);
    const duplicationRatio = 1 - (uniqueLines.size / lines.length);
    if (duplicationRatio < 0.1) score += 1.5;
    else if (duplicationRatio < 0.2) score += 0.5;
    else score -= 1.0;

    // 3. Проверка на обработку ошибок
    if (code.includes('try') && code.includes('catch')) score += 1.0;
    if (code.includes('throw') || code.includes('Error')) score += 0.5;

    // 4. Проверка на модульность
    const functionCount = (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+/g) || []).length;
    if (functionCount > 3) score += 1.0;
    else if (functionCount > 1) score += 0.5;

    // Ограничиваем диапазон [1, 10]
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Оценка инновационности решения
   * @param {Object} solution - Данные о решении
   * @returns {number} Оценка инновационности (1-10)
   */
  evaluateInnovation(solution) {
    let score = 5.0;

    // 1. Использование новых технологий/подходов
    if (solution.usesNewTech) score += 2.0;
    
    // 2. Уникальность решения (проверка через similarity search)
    if (solution.uniquenessScore > 0.8) score += 2.0;
    else if (solution.uniquenessScore > 0.6) score += 1.0;

    // 3. Элегантность решения
    if (solution.eleganceScore > 0.8) score += 1.0;

    return Math.max(1, Math.min(10, score));
  }
}

// Экспорт для использования в Hermes Router
export default IntelDensityEvaluator;
