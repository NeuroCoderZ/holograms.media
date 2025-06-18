// frontend/js/ui/versionManager.js

import * as THREE from 'three'; // Нужен для ObjectLoader

// Переменные для управления версиями и ветками
let currentBranch = 'main'; // Текущая активная ветка
let branches = { main: [] }; // Объект для хранения версий по веткам
let currentVersion = null; // Текущая активная версия

// Временные ссылки на элементы DOM, которые могут понадобиться
// TODO: Возможно, получать их при инициализации или передавать как аргументы
let scene = null; // Ссылка на сцену Three.js
let mainSequencerGroup = null; // Ссылка на основную группу объектов в сцене

/**
 * Устанавливает ссылки на необходимые объекты Three.js.
 * @param {THREE.Scene} threeScene - Ссылка на сцену Three.js.
 * @param {THREE.Group} sequencerGroup - Ссылка на основную группу объектов.
 */
export function setSceneReferences(threeScene, sequencerGroup) {
    scene = threeScene;
    mainSequencerGroup = sequencerGroup;
    console.log('Scene references set in VersionManager.');
}

/**
 * Обновляет таймлайн версий, запрашивая данные с сервера.
 */
export async function updateTimelineFromServer(state) { // Added state
    console.log(`Запрос версий для ветки: ${currentBranch}`);
    try {
        const response = await axios.get(`/branches/${currentBranch}`);
        const versions = response.data.versions;
        const versionFrames = state.uiElements.containers.versionFrames; // Changed to use state

        if (!versionFrames) {
            console.warn('Элемент versionFrames не найден.');
            return;
        }

        versionFrames.innerHTML = ''; // Очищаем текущий таймлайн

        // Сохраняем версии локально
        branches[currentBranch] = versions;

        // Отображаем версии в UI (в обратном порядке, чтобы новые были внизу)
        versions.slice().reverse().forEach((version, index) => {
            const frame = document.createElement('div');
            frame.className = 'version-frame';
            frame.setAttribute('data-version-id', version.version_id);
            frame.innerHTML = `
                <div class="version-placeholder">
                    <span class="version-label">В${versions.length - index}</span>
                </div>
                <div class="version-text">
                    <p>${version.prompt || 'No prompt'}</p>
                </div>
            `;
            frame.addEventListener('click', () => {
                switchToVersion(version.version_id, version.branch);
            });
            versionFrames.appendChild(frame);
        });

        console.log(`Таймлайн обновлен. Загружено версий: ${versions.length}`);

    } catch (error) {
        console.error('Ошибка загрузки версий:', error);
        // alert('Не удалось загрузить версии с сервера'); // Избегаем alert в модулях
    }
}

/**
 * Переключает активную версию на указанную.
 * @param {string} versionId - ID версии для переключения.
 * @param {string} branch - Ветка, к которой относится версия.
 */
async function switchToVersion(versionId, branch) {
    console.log(`Попытка переключиться на версию: ${versionId} в ветке ${branch}`);
    try {
        const response = await axios.put(`/branches/${branch}/switch`, {
            version_id: versionId
        });
        console.log('Переключено на версию:', versionId, 'Данные:', response.data);

        // TODO: Применить состояние сцены и файлы из response.data
        // Логика применения состояния сцены (перенесено из script.js)
        const scene_state = JSON.parse(JSON.stringify(response.data.scene_state)); // Ensure scene_state is a plain object
        if (scene_state && typeof scene_state === 'object' && Object.keys(scene_state).length > 0) {
            // Добавляем проверку на наличие основных полей, которые должны быть в scene.toJSON()
            if (!scene_state.metadata || !scene_state.geometries || !scene_state.materials) {
                console.warn(`Пропуск применения состояния для версии ${versionId}: отсутствуют необходимые поля metadata/geometries/materials.`);
                // return; // Не прерываем, возможно, есть только файлы
            }

            if (scene && mainSequencerGroup) {
                 const loader = new THREE.ObjectLoader();
                 try {
                     const parsedData = loader.parse(scene_state);
                     console.log("Scene state parsed successfully:", parsedData);

                     // Удаляем старую сцену и добавляем новую
                     scene.remove(mainSequencerGroup);
                     mainSequencerGroup = parsedData; // Обновляем ссылку на новую группу
                     scene.add(mainSequencerGroup);

                     console.log("Состояние сцены применено");
                 } catch (e) {
                     console.error("Ошибка парсинга или применения состояния сцены:", e);
                 }
            } else {
                console.warn('Ссылки на сцену или mainSequencerGroup не установлены в VersionManager.');
            }
        }

        // Логика отображения сгенерированного кода в редакторе (перенесено из script.js)
        const files = response.data.files;
        if (files && typeof files['generated_code.js'] === 'string') {
            const fileContentTextArea = document.getElementById('fileContent');
            const fileList = document.getElementById('fileList');

            if (fileContentTextArea) {
                fileContentTextArea.value = files['generated_code.js'];
                fileContentTextArea.dataset.currentFile = 'generated_code.js';
                console.log("Отображен сгенерированный код 'generated_code.js'.");

                // Добавляем файл в список если его нет
                if (fileList && !fileList.querySelector('[data-file="generated_code.js"]')) {
                    const newItem = document.createElement('li');
                    newItem.dataset.file = 'generated_code.js';
                    newItem.textContent = 'generated_code.js';
                    // TODO: Добавить обработчик клика для нового элемента списка файлов
                    // newItem.addEventListener('click', () => { ... });
                    fileList.appendChild(newItem);
                }
                // Выделяем активный файл
                if (fileList) {
                    fileList.querySelectorAll('li').forEach(item => {
                        item.style.fontWeight = item.dataset.file === 'generated_code.js' ? 'bold' : 'normal';
                    });
                }
            }
        }

        // TODO: Обновить UI кнопок версий (активная кнопка)
        const versionButtons = document.querySelectorAll('.version-frame'); // Используем .version-frame
        versionButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.versionId === versionId) {
                button.classList.add('active');
            }
        });

    } catch (error) {
        console.error('Ошибка переключения версии:', error);
        console.error(`Ошибка переключения версии: ${error.response?.data?.detail || error.message}`);
        // alert(`Не удалось переключиться на версию ${versionId}`); // Избегаем alert
    }
}

/**
 * Загружает локальную версию (если логика будет полностью на фронте).
 * @param {object} version - Объект версии.
 */
function loadVersion(version) {
    console.log(`Загрузка локальной версии (ID: ${version.id})`);
    currentVersion = version;
    // TODO: Восстанавливаем состояние сцены и файлов из объекта version
    if (scene && version.sceneState) {
        const loader = new THREE.ObjectLoader();
        try {
            const sceneData = JSON.parse(version.sceneState);
             if (mainSequencerGroup) {
                 scene.remove(mainSequencerGroup);
             }
            mainSequencerGroup = loader.parse(sceneData);
            scene.add(mainSequencerGroup);
            console.log('Состояние сцены восстановлено из локальной версии.');
        } catch (e) {
            console.error('Ошибка парсинга или применения локального состояния сцены:', e);
        }
    }

    // TODO: Обновить UI кнопок версий (активная кнопка)
    // Логика активации кнопки (перенесено из script.js) - возможно, стоит перенести в отдельную функцию или UI Manager
    document.querySelectorAll('.version-button').forEach(b => b.classList.remove('active'));
    // Находим кнопку по data-version, если используется такой атрибут
    const buttonToActivate = document.querySelector(`.version-button[data-version="v${branches[currentBranch].indexOf(version) + 1}"]`);
    if (buttonToActivate) {
        buttonToActivate.classList.add('active');
    }
}

// --- Наблюдатель за изменениями в таймлайне для автоскролла --- (перенесено из script.js)
// DOM-зависимую часть инициализации (MutationObserver) нужно вынести в initializeVersionManager,
// так как state (и uiElements) будет доступен только там.
// --- Конец блока MutationObserver ---

/**
 * Инициализирует VersionManager.
 * Вызывается из main.js.
 * @param {object} state - Глобальный объект состояния приложения.
 */
export function initializeVersionManager(state) { // Changed signature
    console.log('Инициализация VersionManager...');

    const versionFramesContainer = state.uiElements.containers.versionFrames; // Changed to use state
    if (versionFramesContainer) {
        const observer = new MutationObserver((mutationsList, observer) => {
            versionFramesContainer.scrollTop = versionFramesContainer.scrollHeight;
            console.log("Timeline scrolled to bottom via MutationObserver.");
        });
        observer.observe(versionFramesContainer, { childList: true });
        console.log("MutationObserver для автоскролла таймлайна активирован.");
    }

    // TODO: Добавить обработчики событий для кнопок версий, если они не обрабатываются через updateTimelineFromServer
    // (Сейчас обработчики добавляются при создании элементов в updateTimelineFromServer)

    // TODO: Возможно, вызвать updateTimelineFromServer здесь для начальной загрузки
    // updateTimelineFromServer();

    // TODO: Добавить логику для кнопок веток, если они появятся
}

// Экспортируем функции, которые могут понадобиться извне