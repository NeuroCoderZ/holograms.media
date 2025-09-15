// api_diagnostics.js
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g'
];

class APIDignostics {
  async runFullDiagnostics() {
    console.log(' === ПОЛНАЯ ДИАГНОСТИКА GEMINI API ===\n');
    
    // 1. Проверка сетевого соединения
    await this.checkNetworkConnectivity();
    
    // 2. Проверка DNS разрешения
    await this.checkDNSResolution();
    
    // 3. Проверка каждого API ключа
    for (let i = 0; i < API_KEYS.length; i++) {
      await this.checkApiKey(API_KEYS[i], i + 1);
    }
    
    // 4. Проверка доступных моделей
    await this.checkAvailableModels();
    
    // 5. Проверка статуса квот
    await this.checkQuotaStatus();
  }

  async checkNetworkConnectivity() {
    console.log(' Проверка сетевого соединения...');
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: 10000
      }, (res) => {
        console.log(`✅ Сетевое соединение: OK (статус: ${res.statusCode})`);
        resolve(true);
      });
      
      req.on('timeout', () => {
        console.log('❌ Таймаут сетевого соединения (>10сек)');
        resolve(false);
      });
      
      req.on('error', (error) => {
        console.log(`❌ Ошибка сетевого соединения: ${error.message}`);
        
        // Детальная диагностика ошибок
        if (error.code === 'ENOTFOUND') {
          console.log('   → DNS не может разрешить hostname');
        } else if (error.code === 'ECONNREFUSED') {
          console.log('   → Соединение отклонено (возможен блок файрвола)');
        } else if (error.code === 'ETIMEDOUT') {
          console.log('   → Таймаут соединения (медленная сеть/прокси)');
        }
        
        resolve(false);
      });
      
      req.end();
    });
  }
  
  async checkDNSResolution() {
    console.log('\n Проверка DNS разрешения...');
    
    const dns = require('dns');
    
    return new Promise((resolve) => {
      dns.lookup('generativelanguage.googleapis.com', (err, address) => {
        if (err) {
          console.log(`❌ DNS ошибка: ${err.message}`);
          resolve(false);
        } else {
          console.log(`✅ DNS разрешение: ${address}`);
          resolve(true);
        }
      });
    });
  }
  
  async checkApiKey(apiKey, keyNumber) {
    console.log(`\n Проверка API ключа #${keyNumber}...`);
    console.log(`   Ключ: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1beta' });
      
      // Проверяем список моделей (базовая проверка авторизации)
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   HTTP статус: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Ошибка API ключа #${keyNumber}:`);
        console.log(`   Статус: ${response.status} ${response.statusText}`);
        console.log(`   Ответ: ${errorText}`);
        
        // Специфичная диагностика статусов
        if (response.status === 401) {
          console.log('   → Возможные причины:');
          console.log('     • Ключ недействителен или просрочен');
          console.log('     • Ключ не активирован для Embedding API');
          console.log('     • Проблемы с биллингом Google Cloud');
        } else if (response.status === 403) {
          console.log('   → API заблокирован или превышена квота');
        } else if (response.status === 429) {
          console.log('   → Превышен лимит запросов');
        }
        
        return false;
      }
      
      const data = await response.json();
      console.log(`✅ API ключ #${keyNumber}: Действителен`);
      console.log(`   Доступно моделей: ${data.models ? data.models.length : 'неизвестно'}`);
      
      return true;
      
    } catch (error) {
      console.log(`❌ Критическая ошибка при проверке ключа #${keyNumber}:`);
      console.log(`   ${error.message}`);
      return false;
    }
  }
  
  async checkAvailableModels() {
    console.log('\n Проверка доступных моделей эмбеддингов...');
    
    const targetModels = [
      'gemini-embedding-001',
      'text-embedding-001',
      'models/embedding-001'
    ];
    
    for (const apiKey of API_KEYS) {
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];
          
          console.log(`\n Модели, доступные для ключа ${apiKey.substring(0, 8)}...:`);
          
          targetModels.forEach(targetModel => {
            const found = models.find(m => 
              m.name.includes(targetModel) || 
              m.displayName?.includes(targetModel)
            );
            
            if (found) {
              console.log(`   ✅ ${targetModel}: ${found.name}`);
            } else {
              console.log(`   ❌ ${targetModel}: не найдена`);
            }
          });
          
          break; // Достаточно проверить один рабочий ключ
        }
      } catch (error) {
        console.log(`   ❌ Ошибка получения списка моделей: ${error.message}`);
      }
    }
  }
  
  async checkQuotaStatus() {
    console.log('\n Проверка статуса квот...');
    
    // Пробуем создать тестовый эмбеддинг
    for (let i = 0; i < API_KEYS.length; i++) {
      try {
        console.log(`   Тестируем ключ #${i + 1}...`);
        
        const genAI = new GoogleGenerativeAI(API_KEYS[i], { apiVersion: 'v1beta' });
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001', apiVersion: 'v1beta' });
        
        const result = await model.embedContent('test');
        
        if (result && result.embedding) {
          console.log(`   ✅ Ключ #${i + 1}: Квота доступна`);
          console.log(`    Размерность эмбеддинга: ${result.embedding.values.length}`);
          return true;
        }
        
      } catch (error) {
        console.log(`   ❌ Ключ #${i + 1}: ${error.message}`);
        
        if (error.message.includes('quota')) {
          console.log('      → Квота исчерпана');
        } else if (error.message.includes('permission')) {
          console.log('      → Нет разрешения на использование модели');
        }
      }
    }
    
    return false;
  }
}

// Запуск диагностики
const diagnostics = new APIDignostics();
diagnostics.runFullDiagnostics().catch(console.error);
