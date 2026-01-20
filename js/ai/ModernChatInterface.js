import { executeClientTool } from './tools.js';

export class ModernChatInterface {
    constructor(options) {
        console.log('Mock ModernChatInterface initialized with options:', options);
        this.elements = {};
        this.selectedSite = null;
    }

    createNewChat(context, site) {
        console.log('Mock createNewChat called:', { context, site });
        if (this.elements.messagesContainer) {
            const mockMessage = document.createElement('div');
            mockMessage.className = 'chat-message system';
            mockMessage.textContent = 'System: Chat interface ready. Try "/scan on" or "/scan off" to test AI tools.';
            this.elements.messagesContainer.appendChild(mockMessage);
        }
    }

    async sendMessage(message) {
        console.log('Mock sendMessage called:', message);

        if (this.elements.messagesContainer) {
            // User Message
            const userMsg = document.createElement('div');
            userMsg.className = 'chat-message user';
            userMsg.textContent = `You: ${message}`;
            this.elements.messagesContainer.appendChild(userMsg);

            // Mock AI Tool Logic (Simulation of FunctionGemma Decision)
            if (message.toLowerCase().startsWith('/scan')) {
                const isActive = message.includes('on');
                const result = await executeClientTool('toggleScanner', [isActive]);

                setTimeout(() => {
                    const aiMsg = document.createElement('div');
                    aiMsg.className = 'chat-message ai';
                    aiMsg.textContent = `AI: Executing tool... ${result}`;
                    this.elements.messagesContainer.appendChild(aiMsg);
                }, 300);
                return;
            }

            // Standard Mock Response
            setTimeout(() => {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'chat-message ai';
                aiMsg.textContent = 'AI (Mock): I received your message. I am ready for FunctionGemma integration.';
                this.elements.messagesContainer.appendChild(aiMsg);
            }, 500);
        }
    }
}
