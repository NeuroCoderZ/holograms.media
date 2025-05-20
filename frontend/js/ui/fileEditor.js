// TODO: Перенести логику сохранения файла на сервер, когда будет готов бэкенд API

// frontend/js/fileEditor.js

let fileContents = {}; // Локальное хранилище содержимого файлов

// Функция для загрузки и сохранения содержимого файла
async function fetchAndStoreFile(filename) {
  try {
    const response = await fetch(filename); // Запрашиваем файл у сервера
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${filename}`);
    }
    const content = await response.text();
    fileContents[filename] = content;
    console.log(`Содержимое ${filename} загружено.`);
    // Прокручиваем контейнер версий вниз после добавления всех элементов (если это относится к файлам)
    // TODO: Проверить, относится ли эта прокрутка к файлам или версиям и перенести при необходимости
    const timelineContainer = document.getElementById('versionTimeline'); // Получаем сам контейнер
    if (timelineContainer) {
        // Используем requestAnimationFrame для гарантии, что DOM обновлен
        requestAnimationFrame(() => {
            timelineContainer.scrollTop = timelineContainer.scrollHeight;
            console.log("Timeline scrolled to bottom.");
        });
    }

  } catch (error) {
    console.error(`Не удалось загрузить ${filename}:`, error);
    fileContents[filename] = `// Ошибка загрузки ${filename}\n${error}`; // Записываем ошибку в контент
  }
}

// Функция для настройки обработчиков событий файлового редактора
export function setupFileEditor() {
    const fileListElement = document.getElementById('fileList');
    const fileContentTextAreaElement = document.getElementById('fileContent');
    const saveFileButton = document.getElementById('saveFile');

    if (fileListElement && fileContentTextAreaElement) {
        console.log("Настройка обработчиков для списка файлов...");
        fileListElement.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', () => {
                const fileName = item.dataset.file;
                console.log(`Клик по файлу: ${fileName}`);
                if (Object.prototype.hasOwnProperty.call(fileContents, fileName)) {
                    fileContentTextAreaElement.value = fileContents[fileName];
                    fileContentTextAreaElement.dataset.currentFile = fileName; // Обновляем атрибут data-*
                    fileListElement.querySelectorAll('li').forEach(li => {
                        li.style.fontWeight = li.dataset.file === fileName ? 'bold' : 'normal';
                    });
                    console.log(`Отображен файл: ${fileName}`);
                } else {
                    console.warn(`Содержимое для ${fileName} не найдено в fileContents.`);
                    fileContentTextAreaElement.value = `// Не удалось загрузить или найти содержимое ${fileName}`;
                    fileContentTextAreaElement.dataset.currentFile = '';
                     fileListElement.querySelectorAll('li').forEach(li => {
                          li.style.fontWeight = 'normal';
                     });
                }
            });
        });
    } else {
         console.warn("Элементы списка файлов (#fileList) или редактора (#fileContent) не найдены.");
    }

    // Обработчик кнопки Save
    if (saveFileButton && fileContentTextAreaElement) {
         saveFileButton.addEventListener('click', () => {
             const file = fileContentTextAreaElement.dataset.currentFile;
             if (file && Object.prototype.hasOwnProperty.call(fileContents, file)) {
                 fileContents[file] = fileContentTextAreaElement.value;
                 console.log(`Содержимое ${file} сохранено локально (в fileContents).`);
                 alert(`${file} сохранен локально.`);
             } else {
                 console.warn("Не выбран файл для сохранения.");
                 alert("Не выбран файл для сохранения.");
             }
         });
    } else {
         console.warn("Кнопка сохранения (#saveFile) не найдена.");
    }
}

// Функция для загрузки начальных файлов и настройки редактора
export async function loadInitialFilesAndSetupEditor() {
    await Promise.all([
        fetchAndStoreFile('index.html'),
        fetchAndStoreFile('script.js'),
        fetchAndStoreFile('style.css')
    ]).then(() => {
        console.log("Начальное содержимое файлов загружено.");

        const fileContentTextAreaElement = document.getElementById('fileContent');
        const fileListElement = document.getElementById('fileList');
        if (fileContentTextAreaElement && fileContents['script.js']) {
             fileContentTextAreaElement.value = fileContents['script.js'];
             fileContentTextAreaElement.dataset.currentFile = 'script.js';
              if (fileListElement) {
                   fileListElement.querySelectorAll('li').forEach(item => {
                       item.style.fontWeight = item.dataset.file === 'script.js' ? 'bold' : 'normal';
                   });
              }
        } else {
             console.warn("Элемент редактора (#fileContent) или содержимое script.js не найдено.");
        }
        setupFileEditor(); // Настраиваем обработчики после загрузки начальных файлов
    });
}

// TODO: Перенести логику сохранения файла на сервер, когда будет готов бэкенд API