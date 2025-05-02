// frontend/js/audio/speech.js - Синтез речи

import { ui } from '../core/ui.js';

// Настройки синтеза речи
const speechSettings = {
  enabled: true,
  voice: null,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
};

// Инициализация синтеза речи
export function initializeSpeech() {
  console.log('Инициализация системы синтеза речи...');
  
  // Проверяем поддержку синтеза речи
  if (!window.speechSynthesis) {
    console.error('Синтез речи не поддерживается в этом браузере!');
    speechSettings.enabled = false;
    return;
  }
  
  // Загружаем доступные голоса
  loadVoices();
  
  // Обработчик события изменения голосов
  speechSynthesis.onvoiceschanged = loadVoices;
  
  console.log('Система синтеза речи инициализирована.');
}

// Загрузка доступных голосов
function loadVoices() {
  // Получаем список голосов
  const voices = speechSynthesis.getVoices();
  
  if (!voices || voices.length === 0) {
    console.warn('Голоса недоступны!');
    return;
  }
  
  console.log(`Доступно ${voices.length} голосов для синтеза речи.`);
  
  // Ищем предпочтительный голос (русский)
  const preferredVoice = voices.find(voice => 
    voice.lang.includes('ru') && voice.localService
  );
  
  // Если русский голос не найден, ищем английский
  if (!preferredVoice) {
    const enVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.localService
    );
    
    // Если и английский не найден, берем первый доступный
    speechSettings.voice = enVoice || voices[0];
  } else {
    speechSettings.voice = preferredVoice;
  }
  
  console.log(`Выбран голос: ${speechSettings.voice.name} (${speechSettings.voice.lang})`);
}

// Синтез речи из текста
export function synthesizeSpeech(text) {
  // Проверяем, включен ли синтез и поддерживается ли браузером
  if (!speechSettings.enabled || !window.speechSynthesis) {
    console.warn('Синтез речи отключен или не поддерживается!');
    return false;
  }
  
  // Если нет текста или он пустой
  if (!text || text.trim().length === 0) {
    console.warn('Пустой текст для синтеза речи!');
    return false;
  }
  
  // Подготовка текста
  const cleanText = prepareTextForSpeech(text);
  
  // Создаем объект синтеза речи
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Устанавливаем параметры
  utterance.voice = speechSettings.voice;
  utterance.rate = speechSettings.rate;
  utterance.pitch = speechSettings.pitch;
  utterance.volume = speechSettings.volume;
  
  // Событие начала речи
  utterance.onstart = () => {
    console.log('Начало синтеза речи...');
    // Можно добавить визуальную индикацию
    showSpeechIndicator(true);
  };
  
  // Событие окончания речи
  utterance.onend = () => {
    console.log('Синтез речи завершен.');
    // Убираем визуальную индикацию
    showSpeechIndicator(false);
  };
  
  // Обработчик ошибок
  utterance.onerror = (event) => {
    console.error('Ошибка синтеза речи:', event.error);
    showSpeechIndicator(false);
  };
  
  // Запускаем синтез
  speechSynthesis.speak(utterance);
  
  return true;
}

// Остановка синтеза речи
export function stopSpeech() {
  if (window.speechSynthesis) {
    speechSynthesis.cancel();
    showSpeechIndicator(false);
  }
}

// Подготовка текста для синтеза речи
function prepareTextForSpeech(text) {
  if (!text) return '';
  
  // Удаляем HTML-теги
  let cleanText = text.replace(/<[^>]*>/g, ' ');
  
  // Заменяем специальные символы
  cleanText = cleanText.replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
    
  // Удаляем лишние пробелы
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return cleanText;
}

// Показать/скрыть индикатор синтеза речи
function showSpeechIndicator(show) {
  // Находим или создаем индикатор
  let indicator = document.getElementById('speechIndicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'speechIndicator';
    indicator.className = 'speech-indicator';
    indicator.innerHTML = '<i class="fa fa-volume-up"></i>';
    document.body.appendChild(indicator);
  }
  
  // Показываем или скрываем
  indicator.style.display = show ? 'flex' : 'none';
}

// Изменение настроек синтеза речи
export function updateSpeechSettings(settings) {
  if (!settings) return;
  
  // Обновляем настройки
  if (typeof settings.enabled === 'boolean') {
    speechSettings.enabled = settings.enabled;
  }
  
  if (typeof settings.rate === 'number') {
    speechSettings.rate = Math.max(0.1, Math.min(settings.rate, 10.0));
  }
  
  if (typeof settings.pitch === 'number') {
    speechSettings.pitch = Math.max(0.1, Math.min(settings.pitch, 2.0));
  }
  
  if (typeof settings.volume === 'number') {
    speechSettings.volume = Math.max(0.0, Math.min(settings.volume, 1.0));
  }
  
  // Если указан индекс голоса, пробуем установить
  if (typeof settings.voiceIndex === 'number') {
    const voices = speechSynthesis.getVoices();
    if (voices && voices.length > settings.voiceIndex) {
      speechSettings.voice = voices[settings.voiceIndex];
    }
  }
  
  console.log('Настройки синтеза речи обновлены:', speechSettings);
} 