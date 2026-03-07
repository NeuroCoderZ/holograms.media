/**
 * js/ui/MonacoModal.js
 * Creates a full-screen glassmorphic overlay containing Monaco Editor 
 * to view source code of historical commits.
 */

class MonacoModal {
    constructor() {
        this.overlay = null;
        this.editorContainer = null;
        this.editorInstance = null;
        this.monacoLoaded = false;

        this.initDOM();
        this.loadMonaco();
    }

    initDOM() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'monaco-modal-overlay';
        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0', left: '0',
            width: '100vw', height: '100vh',
            zIndex: '10000', // Above everything
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(15px)',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            width: '90%', height: '50px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            padding: '0 20px', color: 'white', fontFamily: 'monospace'
        });

        this.titleEl = document.createElement('span');
        this.titleEl.textContent = 'loading...';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times; Закрыть Редактор';
        Object.assign(closeBtn.style, {
            background: 'transparent', color: 'white', border: 'none',
            fontSize: '16px', cursor: 'pointer', opacity: '0.8'
        });
        closeBtn.onclick = () => this.hide();
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';

        header.appendChild(this.titleEl);
        header.appendChild(closeBtn);

        this.editorContainer = document.createElement('div');
        this.editorContainer.id = 'monaco-container';
        Object.assign(this.editorContainer.style, {
            width: '90%', height: '85%',
            marginTop: '20px', borderRadius: '12px',
            overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        });

        this.overlay.appendChild(header);
        this.overlay.appendChild(this.editorContainer);
        document.body.appendChild(this.overlay);
    }

    loadMonaco() {
        // Load Monaco via AMD loader
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        script.onload = () => {
            window.require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            // Polyfill for Monaco Web Workers
            window.MonacoEnvironment = { getWorkerUrl: () => proxy };
            let proxy = URL.createObjectURL(new Blob([`
                self.MonacoEnvironment = {
                    baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/'
                };
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js');
            `], { type: 'text/javascript' }));

            window.require(['vs/editor/editor.main'], () => {
                this.monacoLoaded = true;
                this.editorInstance = window.monaco.editor.create(this.editorContainer, {
                    value: '// Вставка кода...',
                    language: 'html',
                    theme: 'vs-dark',
                    readOnly: true,
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'Consolas, "Courier New", monospace'
                });
            });
        };
        document.head.appendChild(script);
    }

    async showFile(sha, filename = 'index.html', language = 'html') {
        this.overlay.style.display = 'flex';
        // Allow reflow
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
        });

        this.titleEl.textContent = `View Source: ${filename} @ ${sha.substring(0, 7)}`;

        if (this.editorInstance) {
            this.editorInstance.setValue('// Загрузка кода из GitHub репозитория...');
        }

        try {
            // Load code from raw CDN
            const url = `https://cdn.jsdelivr.net/gh/NeuroCoderZ/holograms.media@${sha}/${filename}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load source: HTTP ${response.status}`);
            }

            const sourceCode = await response.text();

            // Wait for monaco to load if it hasn't
            const waitForMonaco = () => new Promise(resolve => {
                const check = () => this.monacoLoaded ? resolve() : setTimeout(check, 100);
                check();
            });
            await waitForMonaco();

            // Set language model explicitly
            const model = window.monaco.editor.createModel(sourceCode, language);
            this.editorInstance.setModel(model);
        } catch (err) {
            console.error('[MonacoModal] Error loading source:', err);
            if (this.editorInstance) {
                this.editorInstance.setValue(`// Ошибка при загрузке кода:\n// ${err.message}`);
            }
        }
    }

    async showDemoCode(version) {
        this.overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
        });

        this.titleEl.textContent = `View Source: Demo Version ${version.displayId || version.id}`;

        if (this.editorInstance) {
            this.editorInstance.setValue('// Загрузка кода...');
        }

        const waitForMonaco = () => new Promise(resolve => {
            const check = () => this.monacoLoaded ? resolve() : setTimeout(check, 100);
            check();
        });
        await waitForMonaco();

        const dummyCode = `/**\n * Demo Version: ${version.displayId || version.id}\n * Description: ${version.prompt}\n *\n * Note: Source code fetching is disabled for demo versions.\n * Please select a real GitHub commit to view actual source.\n */\n\nconsole.log("Welcome to Holograms.Media Demo v${version.displayId || version.id}");\n`;
        const model = window.monaco.editor.createModel(dummyCode, 'javascript');
        this.editorInstance.setModel(model);
    }

    hide() {
        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 300); // Wait for transition
    }
}

export const monacoModal = new MonacoModal();
