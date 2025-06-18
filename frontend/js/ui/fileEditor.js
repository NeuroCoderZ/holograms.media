// frontend/js/ui/fileEditor.js

let fileContents = {}; // Module-scoped cache for file contents

// Base path for static files, adjust if necessary
const STATIC_BASE_PATH = '/static/';

async function loadFileContent(filePath) {
    const fullPath = filePath.startsWith('/') ? filePath : STATIC_BASE_PATH + filePath;
    try {
        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${fullPath}`);
        }
        const data = await response.text();
        fileContents[fullPath] = data; // Store with full path
        return data;
    } catch (error) {
        console.error(`Error loading file content from ${fullPath}:`, error);
        fileContents[fullPath] = `// Error loading ${fullPath}\n${error}`;
        return null;
    }
}

export async function openFileInEditor(filePath) {
    const editorModal = document.getElementById('fileEditorModal');
    const editorContent = document.getElementById('fileContent');
    const editorFilePath = document.getElementById('editorFilePath');
    const saveFileButton = document.getElementById('saveFile');

    if (!editorModal || !editorContent || !editorFilePath || !saveFileButton) {
        console.error('Editor modal elements (modal, content, filePath, saveButton) not found for openFileInEditor.');
        return;
    }

    editorFilePath.textContent = filePath; // Display the original path for clarity
    editorContent.value = 'Загрузка...';
    editorModal.style.display = 'block';

    const content = await loadFileContent(filePath); // loadFileContent will prepend /static/ if needed

    if (content !== null) {
        editorContent.value = content;
        const fullPathKey = filePath.startsWith('/') ? filePath : STATIC_BASE_PATH + filePath;
        saveFileButton.dataset.currentFilePath = fullPathKey;
        editorContent.dataset.currentFile = fullPathKey;
    } else {
        editorContent.value = `Не удалось загрузить файл: ${filePath}`;
        saveFileButton.dataset.currentFilePath = '';
        editorContent.dataset.currentFile = '';
    }
}

export async function saveFileContent(filePath, content) {
    console.log(`Attempting to save file ${filePath} with content:`, content);
    // TODO: Implement actual saving logic (e.g., to backend)
    alert('Функция сохранения файла пока не реализована.');
    fileContents[filePath] = content; // Update local cache
    console.log(`Содержимое ${filePath} обновлено локально в fileContents.`);
    return false; // Placeholder
}

export function setupFileEditor(state) { // Added state parameter
    const fileListElement = document.getElementById('fileList');
    const fileContentTextAreaElement = document.getElementById('fileContent');
    const saveFileButton = document.getElementById('saveFile');

    if (fileListElement && fileContentTextAreaElement) {
        console.log("FileEditor: Setting up file list item event listeners...");
        fileListElement.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', async () => { // Made async for openFileInEditor
                const fileName = item.dataset.file; // e.g., 'script.js'
                console.log(`FileEditor: Clicked on file list item: ${fileName}`);
                await openFileInEditor(fileName);

                fileListElement.querySelectorAll('li').forEach(li => {
                    li.style.fontWeight = li.dataset.file === fileName ? 'bold' : 'normal';
                });
            });
        });
    } else {
        console.warn("FileEditor: fileListElement or fileContentTextAreaElement not found for setup.");
    }

    if (saveFileButton && fileContentTextAreaElement) {
        saveFileButton.addEventListener('click', async () => { // Made async for saveFileContent
            const filePath = fileContentTextAreaElement.dataset.currentFile;
            if (filePath) {
                const content = fileContentTextAreaElement.value;
                await saveFileContent(filePath, content);
            } else {
                console.warn("FileEditor: No file selected for saving (filePath is empty).");
                alert("Не выбран файл для сохранения.");
            }
        });
    } else {
        console.warn("FileEditor: saveFileButton or fileContentTextAreaElement not found for save listener setup.");
    }
    console.log("FileEditor: setupFileEditor complete.");
}

export async function initializeFileEditor(state) {
    console.log("FileEditor: Initializing...");
    const initialFiles = ['index.html', 'script.js', 'style.css'];

    await Promise.all(initialFiles.map(file => loadFileContent(file)));

    console.log("FileEditor: Initial files metadata loaded into fileContents.");

    setupFileEditor(state);

    const defaultFile = 'script.js';
    const fileListElement = document.getElementById('fileList');
    const fileContentTextAreaElement = document.getElementById('fileContent');

    if (fileContentTextAreaElement) {
        const fullDefaultPath = defaultFile.startsWith('/') ? defaultFile : STATIC_BASE_PATH + defaultFile;
        if (fileContents[fullDefaultPath]) {
            fileContentTextAreaElement.value = fileContents[fullDefaultPath];
            fileContentTextAreaElement.dataset.currentFile = fullDefaultPath;
            if (fileListElement) {
                fileListElement.querySelectorAll('li').forEach(item => {
                    item.style.fontWeight = item.dataset.file === defaultFile ? 'bold' : 'normal';
                });
            }
            console.log(`FileEditor: Displayed default file: ${defaultFile}`);
        } else {
            console.warn(`FileEditor: Default file ${defaultFile} content not found after initial load.`);
            await openFileInEditor(defaultFile);
        }
    } else {
        console.warn("FileEditor: fileContentTextAreaElement not found for displaying default file.");
    }

    const editorModal = document.getElementById('fileEditorModal');
    const closeEditorButton = document.getElementById('closeFileEditorModal');
    if (closeEditorButton && editorModal) {
        closeEditorButton.addEventListener('click', () => editorModal.style.display = 'none');
    }

    // Example: Close on outside click (optional, ensure it doesn't conflict with other global listeners)
    // window.addEventListener('click', (event) => {
    //     if (event.target === editorModal) {
    //         editorModal.style.display = 'none';
    //     }
    // });

    console.log("FileEditor: Initialization complete.");
}