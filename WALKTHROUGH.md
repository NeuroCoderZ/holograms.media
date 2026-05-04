# Hologram Decode MVP v0.20.459 - Walkthrough

## 🎮 Как тестировать Hologram Decode

### 1. Запуск проекта
```bash
npm run dev
```

### 2. Активация режима
1. Нажмите кнопку **#scanButton** 
2. Выберите **"Декод: Голограмма"** из popup меню

### 3. Что должно произойти
```
✅ Камера → Fullscreen режим сканирования
✅ Затемнённый фон + видоискатель (4 уголка)
✅ Детекция: фиолетовая/красная сетка + сферы осей
✅ NeuralDecoder.processFrame() → Tria reconstruction
✅ Обогащённый звук → HologramSynthesizer (реал-тайм)
```

### 4. Ожидаемые логи консоли
```
[HologramScanner] Started
[NeuralDecoderService] Started with Tria
🧠 Neural decode: 0.923
[HologramSynthesizer] update: levels=-12.3dB, pans=[-0.2,0.1...]
```

### 5. Тестирование
1. **Показать анимированную голограмму** (purple/red grids)
2. **Стабилизировать камеру** (viewfinder захватывает)
3. **Услышать reconstructed звук** (harmonics + texture)

## 🚀 Команды для отладки
```javascript
// Console
hologramScanner.getStatus()
neuralDecoder.getStatus()
window.testHologramDecode()  // Self-test
```

**Готово к тестированию!** 🎉

