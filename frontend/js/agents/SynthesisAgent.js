// SynthesisAgent.js - Command generation
   import { BaseAgent } from './BaseAgent.js';
   import { GoogleGenerativeAI } from '@google/generative-ai';
   
   export class SynthesisAgent extends BaseAgent {
       constructor() {
           super('SynthesisAgent', ['command_synthesis', 'context_integration']);
           // Use environment variable or placeholder
           const apiKey = 'YOUR_GEMINI_API_KEY'; // TODO: Replace with actual key
           const genAI = new GoogleGenerativeAI(apiKey);
           this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
       }
       
       async synthesize(userInput, contextData) {
           this.log('Synthesizing holographic command from context...');
           
           const prompt = `
           HOLOGRAPHIC MEDIA CONTEXT:
           ${contextData.map(c => `- ${c.text}`).join('\n')}
           
           USER REQUEST: ${userInput}
           
           Generate a Three.js hologram command as JSON:
           { "action": "create|modify|delete", "parameters": {...}, "explanation": "..." }
           `;
           
           // TODO: Implement actual Gemini API call
           return {
               action: 'create',
               parameters: { 
                   type: 'BoxGeometry', 
                   color: '#00ffff',
                   position: [0,0,0],
                   scale: [1,1,1]
               },
               explanation: `Creating holographic element based on: ${userInput}`
           };
       }
   }