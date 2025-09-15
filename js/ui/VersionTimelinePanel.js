// Manages the display of version history in the timeline panel.

// import VersionService from '../services/VersionService'; // To fetch version data
// import EventBus from '../core/eventBus'; // For events like 'newVersionAdded'

class VersionTimelinePanel {
    constructor(appState, eventBus /*, versionService */) {
        this.appState = appState; // To get current versions or react to changes
        this.eventBus = eventBus;
        // this.versionService = versionService;

        this.versionFramesContainer = document.getElementById('versionFrames'); // The main scrollable container for all frames
        this.versionTimelineWrapper = document.getElementById('versionTimelineContainer'); // The overall wrapper for this panel view

        if (!this.versionFramesContainer) {
            console.error("VersionTimelinePanel: #versionFrames container not found!");
            return;
        }
        if (!this.versionTimelineWrapper) {
            console.warn("VersionTimelinePanel: #versionTimelineContainer wrapper not found. Visibility might be an issue.");
        }

        this.mutationObserver = null;
        this.setupAutoScroll();

        // Example: Listen for an event that signifies new versions are available
        // if (this.eventBus) {
        //     this.eventBus.on('versionsUpdated', (versions) => this.renderTimeline(versions));
        // }

        console.log("VersionTimelinePanel initialized.");
        // this.loadAndRenderVersions(); // Initial load or render demo/placeholder
        this.renderDemoVersions(); // For now, render demo versions
    }

    setupAutoScroll() {
        if (!this.versionFramesContainer) return;

        this.mutationObserver = new MutationObserver((mutationsList, observer) => {
            // Check if the scroll is already near the bottom or if user has scrolled up
            const isScrolledToBottom = this.versionFramesContainer.scrollHeight - this.versionFramesContainer.clientHeight <= this.versionFramesContainer.scrollTop + 10; // 10px threshold

            // Only auto-scroll if new items are added and we are already near the bottom
            // This prevents auto-scrolling if the user has intentionally scrolled up.
            let newNodesAdded = false;
            for(const mutation of mutationsList) {
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

    // async loadAndRenderVersions() {
    //     if (!this.versionService) {
    //         console.warn("VersionService not available, rendering demo versions.");
    //         this.renderDemoVersions();
    //         return;
    //     }
    //     try {
    //         const versions = await this.versionService.fetchVersions(); // Assuming a method like this
    //         this.renderTimeline(versions);
    //     } catch (error) {
    //         console.error("Error loading versions:", error);
    //         this.renderDemoVersions(); // Fallback
    //     }
    // }

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

        // As per plan: Newest versions are at the bottom.
        // If versionsData comes newest first, no reverse needed. If oldest first, then reverse.
        // Assuming versionsData is sorted: oldest first. Let's reverse for display.
        const displayVersions = [...versionsData].reverse();


        displayVersions.forEach((version, index) => {
            const frame = document.createElement('div');
            frame.className = 'version-frame'; // Style: dark background, thin grey border
            frame.dataset.versionId = version.id || `demo-${index}`;

            // Left Placeholder
            const placeholderDiv = document.createElement('div');
            placeholderDiv.className = 'version-placeholder';
            // Placeholder content or styling will be handled by CSS

            // Right Text Container (for prompt)
            const versionTextDiv = document.createElement('div');
            versionTextDiv.className = 'version-text';
            versionTextDiv.textContent = version.prompt || 'No prompt for this version.';
            // Scrollability and text wrapping for versionTextDiv will be handled by CSS

            frame.appendChild(placeholderDiv);
            frame.appendChild(versionTextDiv);

            // Add click listener if needed (e.g., to switch to this version)
            // frame.addEventListener('click', () => {
            //     if (this.eventBus) this.eventBus.emit('versionSelected', version.id);
            //     console.log(`Version ${version.id} clicked.`);
            // });

            this.versionFramesContainer.appendChild(frame);
        });

        // Initial scroll to bottom after rendering
        // The MutationObserver handles subsequent additions, but initial render needs this.
        // Defer slightly to ensure DOM is fully updated.
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
