import { configureGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase'; // If using Firebase for Genkit flows
// import { googleCloud } from '@genkit-ai/google-cloud'; // Example if Vertex was used in future

configureGenkit({
  plugins: [
    firebase(), // Example plugin, assuming Firebase integration for Genkit
    // googleCloud(), // Example for future Vertex AI integration
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true, // Useful for development and debugging
});

// Export flows from here or from individual flow files
// For example, if process_chunk_flow.ts defines flows, they might be exported here
// or directly from their files if using module augmentation or specific registration patterns.
export * from './flows/process_chunk_flow'; // Assuming flows are exported from this file

console.log("Genkit configured in tria-genkit-core/src/index.ts");
