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

            // Phase 2: Thumbnail (Gray Square)
            const thumb = document.createElement('div');
            thumb.className = 'version-thumbnail';
            // Placeholder: gray rounded square defined in CSS

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
                    <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z"/>
                </svg>
            `;
            viewSourceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                eventBus.emit('ui:viewSource', version.id);
            });

            frame.appendChild(thumb);
            frame.appendChild(textContent);
            frame.appendChild(viewSourceBtn);

            this.versionFramesContainer.appendChild(frame);
        });

        // Initial scroll to bottom
        requestAnimationFrame(() => {
            this.scrollToBottom();
        });
    }

    renderDemoVersions() {
        const demoData = [
            { id: 'd1', prompt: 'Initial concept: A simple sphere.', displayId: '1' },
            { id: 'd2', prompt: 'Iteration 2: Added dynamic lighting and shadows to the sphere, making it look more realistic.', displayId: '2' },
            { id: 'd3', prompt: 'Experiment: Changed sphere to a cube with complex textures.', displayId: '3' },
            { id: 'd4', prompt: 'Refinement: Added procedural animation to the cube, reacting to audio input. This version includes a detailed breakdown of the vertex shader modifications.', displayId: '4' },
            { id: 'd5', prompt: 'Final MVP: Integrated user controls for animation speed and color palette. Optimized rendering for smoother performance on mobile devices.', displayId: '5' }
        ];
        this.renderTimeline(demoData);
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
