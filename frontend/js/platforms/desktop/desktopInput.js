// frontend/js/platforms/desktop/desktopInput.js
// import { state } from '../../core/init.js'; // Unused import
import { applyPrompt, loadInitialFilesAndSetupEditor } from '../../core/domEventHandlers.js';
import { toggleFullscreen, initFullscreenListeners } from '../../utils/fullscreen.js';

export class DesktopInput {
    constructor(globalState) {
        this.state = globalState;
        console.log("DesktopInput instantiated.");
    }

    initialize() {
        console.log("DesktopInput initializing...");
        this.setupKeyboardListeners();
        this.setupMouseListeners(); // Will include modal submit buttons
        this.setupGeneralButtonListeners(); // Will include other general buttons

        if (typeof loadInitialFilesAndSetupEditor === 'function') {
            loadInitialFilesAndSetupEditor();
            console.log("DesktopInput: Initialized file editor setup.");
        } else {
            console.error("DesktopInput: loadInitialFilesAndSetupEditor is not a function or not imported.");
        }
        console.log("DesktopInput initialized.");
    }

    setupKeyboardListeners() {
        const topPromptInput = document.getElementById('topPromptInput');
        const submitTopPrompt = document.getElementById('submitTopPrompt');
        if (topPromptInput && submitTopPrompt) {
            topPromptInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (typeof applyPrompt === 'function') {
                        const promptValue = topPromptInput.value.trim();
                        if (promptValue) {
                            applyPrompt(promptValue, document.getElementById('modelSelect').value);
                            topPromptInput.value = '';
                        }
                    } else {
                        console.error("DesktopInput: applyPrompt is not available.");
                    }
                }
            });
            console.log("DesktopInput: Top prompt keypress listener set up.");
        } else {
            console.warn("DesktopInput: Top prompt input or submit button not found for keypress listener.");
        }

        if (submitTopPrompt && topPromptInput) {
            submitTopPrompt.addEventListener('click', () => {
                if (typeof applyPrompt === 'function') {
                    const promptValue = topPromptInput.value.trim();
                    if (promptValue) {
                        applyPrompt(promptValue, document.getElementById('modelSelect').value);
                        topPromptInput.value = '';
                    }
                } else {
                    console.error("DesktopInput: applyPrompt is not available for submit button.");
                }
            });
            console.log("DesktopInput: Top prompt click listener set up.");
        } else {
            console.warn("DesktopInput: Top prompt input or submit button not found for click listener.");
        }
    }

    setupMouseListeners() {
        // GitHub Button
        const githubButton = document.getElementById('githubButton');
        if (githubButton) {
            githubButton.addEventListener('click', () => {
                window.open('https://github.com/NeuroCoderZ/holograms.media', '_blank', 'noopener,noreferrer');
            });
            console.log("DesktopInput: GitHub button listener set up.");
        } else {
            console.warn("DesktopInput: GitHub button not found.");
        }

        // File Editor modal interactions
        const editorModal = document.getElementById('fileEditorModal');
        const closeEditorButton = document.getElementById('closeFileEditorModal');
        if (closeEditorButton && editorModal) {
            closeEditorButton.addEventListener('click', () => editorModal.style.display = 'none');
            console.log("DesktopInput: File editor close button listener set up.");
        } else {
            console.warn("DesktopInput: File editor modal or close button not found.");
        }
        if (editorModal) {
            window.addEventListener('click', (event) => {
                if (event.target === editorModal) editorModal.style.display = 'none';
            });
            console.log("DesktopInput: File editor click outside listener set up.");
        } else {
            console.warn("DesktopInput: File editor modal not found for click outside listener.");
        }

        // Modal close buttons
        const gestureModal = document.getElementById('gestureModal');
        const closeGestureModal = document.getElementById('closeGestureModal');
        if (closeGestureModal && gestureModal) {
            closeGestureModal.addEventListener('click', () => gestureModal.style.display = 'none');
            console.log("DesktopInput: Gesture modal close listener set up.");
        } else {
            console.warn("DesktopInput: Gesture modal or its close button not found.");
        }

        const promptModal = document.getElementById('promptModal');
        const closePromptModal = document.getElementById('closePromptModal');
        if (closePromptModal && promptModal) {
            closePromptModal.addEventListener('click', () => promptModal.style.display = 'none');
            console.log("DesktopInput: Prompt modal close listener set up.");
        } else {
            console.warn("DesktopInput: Prompt modal or its close button not found.");
        }

        // Submit Prompt Button (Modal)
        const submitPromptButton = document.getElementById('submitPrompt');
        const promptText = document.getElementById('promptText'); // Assuming promptText is the ID of the textarea/input in the modal
        if (submitPromptButton && promptText && promptModal) {
            submitPromptButton.addEventListener('click', () => {
                const prompt = promptText.value.trim();
                if (prompt) {
                    if (typeof applyPrompt === 'function') {
                        applyPrompt(prompt, document.getElementById('modelSelect').value);
                        promptText.value = '';
                        promptModal.style.display = 'none';
                    } else {
                        console.error("DesktopInput: applyPrompt is not available for modal submit.");
                    }
                } else {
                    alert('Пожалуйста, введите промпт.');
                }
            });
            console.log("DesktopInput: Modal submit prompt listener set up.");
        } else {
            console.warn("DesktopInput: Modal submit prompt button, text area, or modal itself not found.");
        }
    }

    setupGeneralButtonListeners() {
        const toggleFilesButton = document.getElementById('toggleFilesButton');
        const integratedFileEditor = document.getElementById('integratedFileEditor');
        if (toggleFilesButton && integratedFileEditor) {
            toggleFilesButton.addEventListener('click', () => {
                const isVisible = integratedFileEditor.style.display !== 'none';
                integratedFileEditor.style.display = isVisible ? 'none' : 'block';
                console.log(`DesktopInput: Toggled integrated file editor visibility to ${isVisible ? 'hidden' : 'block'}.`);
            });
            console.log("DesktopInput: Toggle files button listener set up.");
        } else {
            console.warn("DesktopInput: Toggle files button or integrated file editor not found.");
        }

        const fullscreenButton = document.getElementById('fullscreenButton');
        if (fullscreenButton) {
           fullscreenButton.addEventListener('click', () => {
               if (typeof toggleFullscreen === 'function') toggleFullscreen(fullscreenButton);
               else console.error("DesktopInput: toggleFullscreen is not available.");
           });
           if (typeof initFullscreenListeners === 'function') initFullscreenListeners(fullscreenButton);
           else console.error("DesktopInput: initFullscreenListeners is not available.");
           console.log("DesktopInput: Fullscreen button listeners set up.");
        } else {
            console.warn("DesktopInput: Fullscreen button not found.");
        }

        const fileButton = document.getElementById('fileButton');
        const fileInput = document.getElementById('fileInput');
        if (fileButton && fileInput) {
            fileButton.addEventListener('click', () => {
              fileInput.click();
              const playhead = document.getElementById('playhead');
              if (playhead) playhead.style.left = '0%';
            });
            fileInput.addEventListener('change', (event) => {
              console.log('DesktopInput: File selected:', event.target.files[0].name);
              // Call loadAudioFile on the audioFilePlayer instance
              if (this.state.audioFilePlayer) {
                this.state.audioFilePlayer.loadAudioFile(event);
              } else {
                console.error("audioFilePlayer instance not found in state for file input change.");
              }
              event.target.value = '';
            });
            console.log("DesktopInput: File button and input listeners set up.");
        } else {
            console.warn("DesktopInput: File button or file input not found.");
        }

        // Toggle Camera Button
        const toggleCameraButton = document.getElementById('toggleCameraButton');
        if (toggleCameraButton) {
            toggleCameraButton.addEventListener('click', () => {
              console.log('DesktopInput: Toggle Camera button clicked - logic handled by cameraManager.js or other specific module');
            });
            console.log("DesktopInput: Toggle camera button listener set up.");
        } else {
            console.warn("DesktopInput: Toggle camera button not found.");
        }

        // Gesture Record Button
        const gestureRecordButton = document.getElementById('gestureRecordButton');
        if (gestureRecordButton) {
            gestureRecordButton.addEventListener('click', () => {
              console.log('DesktopInput: Gesture Record button clicked - logic handled elsewhere');
            });
            console.log("DesktopInput: Gesture record button listener set up.");
        } else {
            console.warn("DesktopInput: Gesture record button not found.");
        }

        // Scan Button
        const scanButton = document.getElementById('scanButton');
        if (scanButton) {
            scanButton.addEventListener('click', () => {
              console.log('DesktopInput: Scan button clicked - logic handled elsewhere');
            });
            console.log("DesktopInput: Scan button listener set up.");
        } else {
            console.warn("DesktopInput: Scan button not found.");
        }

        // Bluetooth Button
        const bluetoothButton = document.getElementById('bluetoothButton');
        if (bluetoothButton) {
            bluetoothButton.addEventListener('click', () => {
              console.log('DesktopInput: Bluetooth button clicked - logic handled elsewhere');
            });
            console.log("DesktopInput: Bluetooth button listener set up.");
        } else {
            console.warn("DesktopInput: Bluetooth button not found.");
        }

        // Microphone Button
        const microphoneButton = document.getElementById('microphoneButton');
        if (microphoneButton) {
            microphoneButton.addEventListener('click', () => {
                if (this.state.microphoneManager) {
                    this.state.microphoneManager.toggleMicrophone(); // Pass state as argument
                } else {
                    console.error("microphoneManager instance not found in state.");
                }
            });
            console.log("DesktopInput: Microphone button listener set up.");
        } else {
            console.warn("DesktopInput: Microphone button not found.");
        }

        // Play Audio Button
        const playAudioButton = document.getElementById('playAudioButton');
        if (playAudioButton) {
            playAudioButton.addEventListener('click', () => {
                if (this.state.audioFilePlayer) {
                    this.state.audioFilePlayer.playAudio();
                } else {
                    console.error("audioFilePlayer instance not found in state for play button.");
                }
            });
            console.log("DesktopInput: Play Audio button listener set up.");
        } else {
            console.warn("DesktopInput: Play Audio button not found.");
        }

        // Pause Audio Button
        const pauseAudioButton = document.getElementById('pauseAudioButton');
        if (pauseAudioButton) {
            pauseAudioButton.addEventListener('click', () => {
                if (this.state.audioFilePlayer) {
                    this.state.audioFilePlayer.pauseAudio();
                } else {
                    console.error("audioFilePlayer instance not found in state for pause button.");
                }
            });
            console.log("DesktopInput: Pause Audio button listener set up.");
        } else {
            console.warn("DesktopInput: Pause Audio button not found.");
        }

        // Stop Audio Button
        const stopAudioButton = document.getElementById('stopAudioButton');
        if (stopAudioButton) {
            stopAudioButton.addEventListener('click', () => {
                if (this.state.audioFilePlayer) {
                    this.state.audioFilePlayer.stopAudio();
                } else {
                    console.error("audioFilePlayer instance not found in state for stop button.");
                }
            });
            console.log("DesktopInput: Stop Audio button listener set up.");
        } else {
            console.warn("DesktopInput: Stop Audio button not found.");
        }
    }
}
