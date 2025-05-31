// frontend/js/core/ui/chatUI.js - Core Chat UI logic.

import { auth } from '../firebaseInit.js'; // Firebase Auth for currentUser

// Placeholder for the Cloud Function URL.
// Replace this with your actual deployed Cloud Function URL.
const TRIA_CHAT_HANDLER_URL = 'https://europe-west1-holograms-media.cloudfunctions.net/tria_chat_handler_on_request';
// Example: 'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/tria_chat_handler_on_request';

let chatMessagesContainer = null;
let chatInputElement = null;
let chatSendButtonElement = null;

/**
 * Appends a message to the chat messages container.
 * @param {string} sender - The sender of the message (e.g., "User", "Tria").
 * @param {string} messageText - The text content of the message.
 */
function appendMessage(sender, messageText) {
    if (!chatMessagesContainer) {
        console.error("Chat messages container not initialized.");
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message'); // For styling

    const senderStrong = document.createElement('strong');
    senderStrong.textContent = `${sender}: `;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = messageText;

    messageDiv.appendChild(senderStrong);
    messageDiv.appendChild(messageSpan);

    chatMessagesContainer.appendChild(messageDiv);

    // Scroll to the bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

/**
 * Sends the user's message to the Tria chat handler Cloud Function.
 */
async function sendMessage() {
    if (!chatInputElement || !chatSendButtonElement) {
        console.error("Chat input elements not initialized.");
        return;
    }

    const inputText = chatInputElement.value.trim();
    if (!inputText) {
        return; // Do nothing if input is empty
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("No user signed in. Cannot send chat message.");
        appendMessage("System", "Error: You must be signed in to chat.");
        return;
    }
    const firebaseUserId = currentUser.uid;

    appendMessage("User", inputText); // Display user's message immediately
    chatInputElement.value = ''; // Clear the input field
    chatSendButtonElement.disabled = true; // Disable send button temporarily

    try {
        const response = await fetch(TRIA_CHAT_HANDLER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: inputText,
                firebase_user_id: firebaseUserId,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const botResponse = data.response || "Sorry, I didn't get a proper response.";
            appendMessage("Tria", botResponse);
        } else {
            const errorData = await response.json().catch(() => ({ response: "Sorry, I encountered an error and couldn't parse the details." }));
            console.error("Error sending message:", response.status, errorData);
            appendMessage("Tria", errorData.response || `Error: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Failed to send message:", error);
        appendMessage("Tria", "Sorry, there was a problem connecting to the chat service.");
    } finally {
        if (chatSendButtonElement) chatSendButtonElement.disabled = false; // Re-enable send button
        if (chatInputElement) chatInputElement.focus(); // Focus back on input
    }
}

/**
 * Initializes the Chat UI by getting element references and setting up event listeners.
 */
export function initChatUI() {
    chatMessagesContainer = document.getElementById('chatMessages'); // From index.html
    chatInputElement = document.getElementById('chatInput');       // From index.html
    chatSendButtonElement = document.getElementById('submitChatMessage'); // From index.html (was submitChatMessage)

    if (!chatMessagesContainer) {
        console.warn("Chat UI: 'chatMessages' container not found in DOM. Chat will not function.");
        return;
    }
    if (!chatInputElement) {
        console.warn("Chat UI: 'chatInput' element not found in DOM. Chat will not function.");
        return;
    }
    if (!chatSendButtonElement) {
        console.warn("Chat UI: 'chatSendButton' (expected 'submitChatMessage') not found in DOM. Chat will not function.");
        return;
    }

    chatSendButtonElement.addEventListener('click', sendMessage);
    chatInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for newline
            event.preventDefault(); // Prevent default Enter behavior (like adding a newline)
            sendMessage();
        }
    });

    console.log("Chat UI Initialized. Using Cloud Function URL placeholder:", TRIA_CHAT_HANDLER_URL);
    // You might want to append a welcome message or load history here
    // appendMessage("System", "Welcome to Tria Chat! Type your message below and press Enter or Send.");
}

// Note for main.js or equivalent:
// Ensure initChatUI() is called after the DOM is fully loaded.
// Example:
// import { initChatUI } from './core/ui/chatUI.js';
// document.addEventListener('DOMContentLoaded', () => {
//   initChatUI();
// });
// Or, if called from another init function that already ensures DOM is ready:
// initChatUI();
