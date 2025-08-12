import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      ecmaVersion: 2022, // Используем современный стандарт JS
      sourceType: "module", // Используем import/export
      globals: {
        ...globals.browser, // Добавляем стандартные глобальные переменные браузера
        // Добавляем наши глобальные переменные из библиотек:
        THREE: "readonly",
        TWEEN: "readonly",
        Hammer: "readonly",
        axios: "readonly",
        Hands: "readonly",
        HAND_CONNECTIONS: "readonly", // Предполагаем, что она глобальна
        Camera: "readonly", // Если используется MediaPipe Camera
        drawConnectors: "readonly", // MediaPipe Drawing Utils
        drawLandmarks: "readonly" // MediaPipe Drawing Utils
        // Добавь сюда другие, если ESLint будет ругаться
      }
    }
  },
  pluginJs.configs.recommended, // Применяем рекомендованные правила ESLint
  {
    rules: {
      // Настроим правила:
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }], // Предупреждать о неиспользуемых переменных/аргументах (кроме тех, что начинаются с _)
      "no-undef": "error", // Оставляем ошибку для действительно неопределенных
      "no-prototype-builtins": "warn" // Предупреждать, но не считать ошибкой использование hasOwnProperty напрямую
      // Сюда можно добавить другие правила по желанию
    }
  }
];
