// js/config/cloudConfig.example.js
// Example config file for Holograms.Media. Replace placeholders with real values in your local js/config/cloudConfig.js (which should be gitignored).

export const cloudConfig = {
  astra: {
    clientId: '<YOUR_ASTRA_CLIENT_ID>',
    secret: '<YOUR_ASTRA_SECRET>',
    token: '<YOUR_ASTRA_TOKEN>',
    databaseId: '<YOUR_DATABASE_ID>',
    region: 'us-east-1'
  },

  koyeb: {
    deploymentId: '<YOUR_KOYEB_DEPLOYMENT_ID>',
    apiUrl: 'https://your-koyeb-app.example',
    gestureProcessingEndpoint: '/api/gesture-processing'
  },

  // Storage: AstraDB only (B2 removed, R2 planned)
  astra: {
    token: '<YOUR_ASTRA_DB_TOKEN>',
    databaseId: '<YOUR_ASTRA_DB_ID>',
    region: 'us-east-2'
  },

  cloudflare: {
    wranglerToken: '<YOUR_CLOUDFLARE_WRANGLER_TOKEN>',
    accountId: '<YOUR_CLOUDFLARE_ACCOUNT_ID>',
    gestureApiUrl: 'https://your-cloudflare-workers.example/api/gestures',
    triaApiToken: '<YOUR_TRIA_API_TOKEN>'
  },

  endpoints: {
    gestures: {
      save: '/api/gestures/save',
      load: '/api/gestures/user/{userId}',
      delete: '/api/gestures/delete/{gestureId}',
      list: '/api/gestures/list'
    }
  },

  security: {
    encryptionKey: '<YOUR_ENCRYPTION_KEY>',
    tokenExpiration: 3600,
    maxRetries: 3,
    timeout: 10000
  },

  performance: {
    maxConcurrentRequests: 5,
    cacheExpiration: 300000,
    compressionEnabled: true
  }
};

export const getPublicConfig = () => ({
  endpoints: cloudConfig.endpoints,
  koyeb: { apiUrl: cloudConfig.koyeb.apiUrl },
  cloudflare: { gestureApiUrl: cloudConfig.cloudflare.gestureApiUrl }
});
