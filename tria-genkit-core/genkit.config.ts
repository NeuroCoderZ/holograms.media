import { configureGenkit } from '@genkit-ai/core';
import { googleCloud } from '@genkit-ai/google-cloud';
// import { firebase } from '@genkit-ai/firebase'; // If using Firebase plugin features

export default configureGenkit({
  plugins: [
    googleCloud(), // Initialize Google Cloud plugin
    // firebase(), // Initialize Firebase plugin if needed for specific Genkit Firebase features
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
