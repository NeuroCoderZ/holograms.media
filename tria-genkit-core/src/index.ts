import { defineFlow, runFlow } from '@genkit-ai/flow';
import { googleAI } from '@genkit-ai/google-ai'; // Example, if using Gemini
import * as z from 'zod';

// Initialize any necessary plugins here if not globally in genkit.config.ts
// e.g., if specific models are needed for this flow
// configureGenkit({
//   plugins: [googleAI()], // Example for Gemini
// });

export const sampleFlow = defineFlow(
  {
    name: 'sampleFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(`[SampleFlow] Received input: ${input}`);
    // Example: Using a Genkit model (ensure it's configured)
    // const llm = geminiPro; // Assuming geminiPro is an available model
    // const response = await generate({
    //   model: llm,
    //   prompt: `You are a helpful assistant. Respond to: ${input}`,
    // });
    // return response.text();
    return `Echo from sampleFlow: ${input}`;
  }
);

// Example of how to run this flow (optional, for testing)
// async function runSample() {
//   const result = await runFlow(sampleFlow, "Hello Genkit!");
//   console.log("[SampleFlow] Result:", result);
// }
// runSample();

console.log('Genkit sample flow (index.ts) loaded. Define your flows here.');
