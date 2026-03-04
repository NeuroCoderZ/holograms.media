import versionService from '../services/VersionService.js';

class VersionTimelinePanel {
    constructor(appState, eventBus) {
        this.appState = appState;
        this.eventBus = eventBus;
        this.versionService = versionService;

        this.versionFramesContainer = document.getElementById('versionFrames');
        this.versionTimelineWrapper = document.getElementById('versionTimeline');

        if (!this.versionFramesContainer) {
            console.error("VersionTimelinePanel: #versionFrames container not found!");
            return;
        }

        this.mutationObserver = null;
        this.setupAutoScroll();

        // Слушаем обновления от Tria или других модулей
        if (this.eventBus) {
            this.eventBus.on('versions:refresh', () => this.loadAndRenderVersions());
        }

        console.log("VersionTimelinePanel initialized.");
        this.loadAndRenderVersions(); // Первичная загрузка реальных данных
    }

    setupAutoScroll() {
        if (!this.versionFramesContainer) return;

        this.mutationObserver = new MutationObserver((mutationsList, observer) => {
            // Check if the scroll is already near the bottom or if user has scrolled up
            const isScrolledToBottom = this.versionFramesContainer.scrollHeight - this.versionFramesContainer.clientHeight <= this.versionFramesContainer.scrollTop + 10; // 10px threshold

            // Only auto-scroll if new items are added and we are already near the bottom
            // This prevents auto-scrolling if the user has intentionally scrolled up.
            let newNodesAdded = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    newNodesAdded = true;
                    break;
                }
            }

            if (newNodesAdded && isScrolledToBottom) {
                this.scrollToBottom();
            } else if (newNodesAdded && this.versionFramesContainer.children.length <= 1) {
                // Or if it's the very first item, always scroll
                this.scrollToBottom();
            }
        });

        this.mutationObserver.observe(this.versionFramesContainer, { childList: true });
        console.log("VersionTimelinePanel: MutationObserver for auto-scroll setup.");
    }

    scrollToBottom() {
        if (this.versionFramesContainer) {
            this.versionFramesContainer.scrollTop = this.versionFramesContainer.scrollHeight;
            console.log("VersionTimelinePanel: Scrolled to bottom.");
        }
    }

    async loadAndRenderVersions() {
        if (!this.versionService) {
            console.warn("VersionService not available, rendering demo versions.");
            this.renderDemoVersions();
            return;
        }
        try {
            const versions = await this.versionService.fetchVersions(20);
            if (versions && versions.length > 0) {
                this.renderTimeline(versions);
            } else {
                this.renderDemoVersions(); // Fallback to demo if API fails
            }
        } catch (error) {
            console.error("Error loading versions:", error);
            this.renderDemoVersions(); // Fallback
        }
    }

    renderTimeline(versionsData) {
        if (!this.versionFramesContainer) return;

        this.versionFramesContainer.innerHTML = ''; // Clear existing frames

        if (!versionsData || versionsData.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No versions available.';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '20px';
            this.versionFramesContainer.appendChild(emptyMsg);
            return;
        }

        // ТЗ v4.5: Новые версии внизу. 
        // GitHub API возвращает последние первыми, поэтому реверсируем, чтобы новые были внизу.
        const displayVersions = [...versionsData].reverse();

        displayVersions.forEach((version, index) => {
            const frame = document.createElement('div');
            frame.className = 'version-frame';
            frame.dataset.versionId = version.id || `v-${index}`;

            // Phase 2/3: Thumbnail (QR Code)
            const thumb = document.createElement('div');
            thumb.className = 'version-thumbnail';
            thumb.style.display = 'block'; // Ensure it's visible
            thumb.style.padding = '4px'; // White border padding for QR
            thumb.style.backgroundColor = 'white';

            // Generate QR Code if qrcode is loaded
            if (typeof QRCode !== 'undefined') {
                new QRCode(thumb, {
                    text: version.url,
                    width: 40,
                    height: 40,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
            }

            // Text Content (Prompt)
            const textContent = document.createElement('div');
            textContent.className = 'version-content';

            const label = document.createElement('div');
            label.className = 'version-id-label';
            label.textContent = version.displayId || version.id.substring(0, 7);

            const promptText = document.createElement('div');
            promptText.className = 'version-prompt-text';
            promptText.textContent = version.prompt || 'No description';

            textContent.appendChild(label);
            textContent.appendChild(promptText);

            // Phase 2: ViewSource Button (Google icon)
            const viewSourceBtn = document.createElement('button');
            viewSourceBtn.className = 'view-source-btn';
            viewSourceBtn.title = 'Просмотреть код';
            viewSourceBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
                    <path d="M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z"/>
                </svg>
            `;
            viewSourceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                eventBus.emit('ui:viewSource', version.id);
            });

            frame.appendChild(thumb);
            frame.appendChild(textContent);
            frame.appendChild(viewSourceBtn);

            // Phase 3: Hot-Swap handling
            frame.addEventListener('click', () => {
                this.hotSwapVersion(version.id);
            });

            this.versionFramesContainer.appendChild(frame);
        });

        // Initial scroll to bottom
        requestAnimationFrame(() => {
            this.scrollToBottom();
        });
    }

    renderDemoVersions() {
        const demoData = [
            { id: 'd1', prompt: 'Initial concept: A simple sphere.', displayId: '1', url: 'https://github.com' },
            { id: 'd2', prompt: 'Iteration 2: Added dynamic lighting and shadows to the sphere.', displayId: '2', url: 'https://github.com' },
            { id: 'd3', prompt: 'Experiment: Changed sphere to a cube with complex textures.', displayId: '3', url: 'https://github.com' },
            { id: 'd4', prompt: 'Refinement: Added procedural animation to the cube, reacting to audio input.', displayId: '4', url: 'https://github.com' },
            { id: 'd5', prompt: 'Final MVP: Integrated user controls for animation speed.', displayId: '5', url: 'https://github.com' }
        ];
        this.renderTimeline(demoData);
    }

    /**
     * Hot-Swaps to a specific commit version using an iframe overlay.
     * Loads the raw static index.html from raw.githack.com
     */
    hotSwapVersion(sha) {
        console.log(`[VersionTimelinePanel] Hot-swapping to version: ${sha}`);

        let overlay = document.getElementById('hotswap-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'hotswap-overlay';
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0', left: '0', width: '100vw', height: '100vh',
                zIndex: '9999',
                backgroundColor: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column'
            });

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times; Закрыть версию';
            Object.assign(closeBtn.style, {
                position: 'absolute', top: '20px', right: '20px',
                padding: '10px 20px', fontSize: '18px',
                backgroundColor: 'rgba(255,255,255,0.1)', color: 'white',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
                cursor: 'pointer', zIndex: '10000', backdropFilter: 'blur(5px)'
            });
            closeBtn.onclick = () => { overlay.style.display = 'none'; };

            const iframe = document.createElement('iframe');
            iframe.id = 'hotswap-iframe';
            Object.assign(iframe.style, {
                width: '100%', height: '100%', border: 'none'
            });

            overlay.appendChild(closeBtn);
            overlay.appendChild(iframe);
            document.body.appendChild(overlay);
        }

        const iframe = document.getElementById('hotswap-iframe');
        // Use raw.githack to serve raw GitHub files with proper Content-Type
        iframe.src = `https://raw.githack.com/NeuroCoderZ/holograms.media/${sha}/index.html`;
        overlay.style.display = 'flex';
    }

    destroy() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
            console.log("VersionTimelinePanel: MutationObserver disconnected.");
        }
        // Remove event listeners if any were added directly
    }
}

// Export the class
export default VersionTimelinePanel;
