// backend/tria_agents/tfjs_adapter.js
// Маленькая нейросеть на TensorFlow.js для предсказания жестов

const tf = require('@tensorflow/tfjs-node'); // Используем node версию для сервера

// Простая модель для предсказания классов жестов
let gestureModel;

async function initGestureModel() {
    if (!gestureModel) {
        gestureModel = tf.sequential();
        gestureModel.add(tf.layers.dense({ inputShape: [20], units: 10, activation: 'relu' })); // Вход: 20 признаков жеста
        gestureModel.add(tf.layers.dense({ units: 5, activation: 'relu' })); // Скрытый слой
        gestureModel.add(tf.layers.dense({ units: 3, activation: 'softmax' })); // Выход: 3 класса жестов (например, wave, point, fist)
        gestureModel.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
        console.log('Модель предсказания жестов инициализирована.');
    }
}

async function trainGestureModel(gestureData) {
    await initGestureModel();

    // Преобразовать gestureData в тензоры
    const features = extractGestureFeatures(gestureData);
    const labels = tf.tensor2d([gestureData.label || [1, 0, 0]]); // One-hot encoded labels

    // Обучить модель
    await gestureModel.fit(tf.tensor2d([features]), labels, { epochs: 1 });
    console.log('Модель жестов обучена на основе данных.');
}

function extractGestureFeatures(data) {
    // Извлечение признаков из данных жеста, например, координаты landmark'ов
    return [
        data.x1 || 0, data.y1 || 0, data.z1 || 0,
        data.x2 || 0, data.y2 || 0, data.z2 || 0,
        data.x3 || 0, data.y3 || 0, data.z3 || 0,
        data.x4 || 0, data.y4 || 0, data.z4 || 0,
        data.x5 || 0, data.y5 || 0, data.z5 || 0,
        data.intensity || 0, data.speed || 0, data.angle || 0,
        data.confidence || 0, data.timestamp || 0
    ];
}

async function predictGesture(inputData) {
    await initGestureModel();
    const features = extractGestureFeatures(inputData);
    const prediction = gestureModel.predict(tf.tensor2d([features]));
    const result = await prediction.data();
    const predictedClass = result.indexOf(Math.max(...result));
    console.log('Предсказанный жест:', predictedClass);
    return predictedClass; // 0, 1, 2 для разных жестов
}

// Основная функция для вызова из Python
async function main() {
    const gestureData = JSON.parse(process.argv[2]);
    if (process.argv[3] === 'train') {
        await trainGestureModel(gestureData);
    } else {
        const prediction = await predictGesture(gestureData);
        console.log(JSON.stringify({ prediction }));
    }
}

if (require.main === module) {
    main().catch(console.error);
}
