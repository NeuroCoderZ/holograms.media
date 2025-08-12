// frontend/js/core/HologramAIEngine.js (FINAL REWRITE)
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function for vector math
function dotProduct(vecA, vecB) {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

const GEMINI_API_KEY = 'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23gE'; // TODO: Replace with your actual key

export class HologramAIEngine {
  constructor() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('Gemini API Key is not configured in HologramAIEngine.js');
    }
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Main model for generating commands
    this.generativeModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    // Separate, specialized model for creating embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    this.embeddings = [];
  }

  // NEW: Streaming loader for large JSON arrays
  async loadEmbeddings(path) {
    if (this.embeddings.length > 0) return;
    console.log(` Attempting to stream-load embeddings from: ${path}`);

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // A simple streaming parser for a JSON array of objects
      // This is brittle and assumes a specific format, but avoids loading all data into memory
      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let start = buffer.indexOf('{');
            let braceCount = 0;

            for (let i = start; i < buffer.length; i++) {
              if (buffer[i] === '{') braceCount++;
              if (buffer[i] === '}') braceCount--;

              if (start !== -1 && braceCount === 0) {
                const jsonStr = buffer.substring(start, i + 1);
                try {
                  controller.enqueue(JSON.parse(jsonStr));
                  buffer = buffer.substring(i + 1);
                  start = buffer.indexOf('{');
                  i = start - 1; // Reset loop
                } catch (e) {
                  // Incomplete JSON object, continue buffering
                }
              }
            }
          }
          controller.close();
        }
      });

      // Consume the stream
      const reader2 = stream.getReader();
      while (true) {
        const { done, value } = await reader2.read();
        if (done) break;
        this.embeddings.push(value);
        if (this.embeddings.length % 1000 === 0) {
          console.log(`...loaded ${this.embeddings.length} embeddings...`);
        }
      }
      console.log(`✅ Streaming finished. Total embeddings loaded: ${this.embeddings.length}`);
    } catch (error) {
      console.error('CRITICAL: Failed to stream-load embeddings:', error);
    }
  }

  // NEW: Vector search implementation
  async findRelevantContext(query, maxResults = 5) {
    if (this.embeddings.length === 0) return [];

    console.log(`Creating embedding for query: "${query}"`);
    const queryEmbeddingResult = await this.embeddingModel.embedContent(query);
    const queryVector = queryEmbeddingResult.embedding.values;

    const scoredResults = this.embeddings.map(emb => {
      const similarity = dotProduct(queryVector, emb.embedding);
      return { text: emb.text, score: similarity };
    });

    scoredResults.sort((a, b) => b.score - a.score);

    console.log('Top 5 relevant contexts found:', scoredResults.slice(0, maxResults));
    return scoredResults.slice(0, maxResults).map(item => item.text);
  }

  // Main method to generate commands
  async generateHologramCommand(userInput) {
    const context = await this.findRelevantContext(userInput);

    const prompt = `You are Tria, an AI assistant specializing in holographic media and 3D audio-visualization.\nYour task is to translate a user's natural language request into a specific JSON command to control a Three.js scene.\n\nPROJECT CONTEXT based on user's request:\n---\n${context.join('\n\n')}\n---\n\nUSER REQUEST:\n"${userInput}"\n\nINSTRUCTIONS:\nGenerate a single JSON object that represents the command.\nAvailable actions: 'create', 'modify', 'animate', 'clear'.\nThe output MUST be a valid JSON object enclosed in \'\'\'json ... \'\'\'.\n\nEXAMPLE FORMAT:\n\'\'\'json\n{\n  "action": "create",\n  "target": "geometry",\n  "parameters": {\n    "type": "SphereGeometry",\n    "radius": 2,\n    "color": "#00ff00",\n    "position": [0, 5, -10]\n  },\n  "explanation": "I will create a green sphere with a radius of 2 at the center of the scene."\n}\n\'\'\'
`;

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const responseText = result.response.text();

      // NEW: Robust JSON parsing
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Could not parse JSON command from AI response.');
    } catch (error) {
      console.error('Error generating hologram command:', error);
      return null;
    }
  }
}