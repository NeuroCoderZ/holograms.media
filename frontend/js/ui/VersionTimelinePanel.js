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

            // Version Label (Oval)
            const label = document.createElement('span');
            label.className = 'version-label'; // Style: oval shape, top-left
            label.textContent = `V${displayVersions.length - index}`; // Newest is V_max, oldest is V1 if reversed
                                                                    // Or, if data is newest first: V${versionsData.length - index}
                                                                    // Let's assume data is oldest first, after reverse, current index 0 is newest.
                                                                    // So, if versionsData had N items, after reverse, index 0 is original N-1.
                                                                    // The label should be V + (original index + 1).
                                                                    // To keep it simple: if data is [vA, vB, vC] (old to new)
                                                                    // displayVersions is [vC, vB, vA]
                                                                    // vC (index 0) should be V3
                                                                    // vB (index 1) should be V2
                                                                    // vA (index 2) should be V1
                                                                    // So, label is V${original_length - original_index}
                                                                    // If data comes with a predefined display number, use that.
                                                                    // For now, using index from reversed array (0 = newest)
            label.textContent = `V${version.displayId || (versionsData.indexOf(version) + 1)}`;


            // Prompt Text (Scrollable)
            const textContainer = document.createElement('div');
            textContainer.className = 'version-text-container'; // For styling scrollability

            const promptText = document.createElement('p');
            promptText.className = 'version-prompt-text';
            promptText.textContent = version.prompt || 'No prompt for this version.';

            textContainer.appendChild(promptText);

            frame.appendChild(label);
            frame.appendChild(textContainer);

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
