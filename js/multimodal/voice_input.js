// File: frontend/js/multimodal/voice_input.js
// Purpose: Handles voice input from the user, including microphone access and speech recognition.
// Key Future Dependencies: Web Speech API (SpeechRecognition), or third-party speech-to-text services.
// Main Future Exports/API: VoiceInputManager class, startRecognition(), stopRecognition().
// Link to Legacy Logic (if applicable): May supersede or integrate with parts of existing speechInput.js.
// Intended Technology Stack: JavaScript, Web Speech API.
// TODO: Implement microphone access using navigator.mediaDevices.getUserMedia.
// TODO: Set up SpeechRecognition engine with appropriate language and parameters.
// TODO: Handle recognition results, errors, and events (speechstart, speechend).
// TODO: Send recognized text to chat or Tria for processing.

class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isRecognizing = false;
        this.finalTranscript = '';

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true; // Keep recognizing
            this.recognition.interimResults = true; // Get interim results
            this.recognition.lang = 'en-US'; // TODO: Make configurable

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        this.finalTranscript += event.results[i][0].transcript;
                        // TODO: Fire event or callback with final transcript
                        console.log("Final transcript:", event.results[i][0].transcript);
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                        // TODO: Fire event or callback with interim transcript
                        console.log("Interim transcript:", interimTranscript);
                    }
                }
            };

            this.recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                this.isRecognizing = false;
                // TODO: Handle errors (e.g., no-speech, network, service-not-allowed)
            };

            this.recognition.onend = () => {
                this.isRecognizing = false;
                console.log("Speech recognition ended.");
                // TODO: Restart recognition if needed, or notify UI
            };

        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }
    }

    startRecognition() {
        if (this.recognition && !this.isRecognizing) {
            this.finalTranscript = '';
            this.recognition.start();
            this.isRecognizing = true;
            console.log("Speech recognition started.");
        }
    }

    stopRecognition() {
        if (this.recognition && this.isRecognizing) {
            this.recognition.stop();
            this.isRecognizing = false;
            console.log("Speech recognition stopped manually.");
        }
    }

    getFinalTranscript() {
        return this.finalTranscript;
    }
}

// export { VoiceInputManager };
