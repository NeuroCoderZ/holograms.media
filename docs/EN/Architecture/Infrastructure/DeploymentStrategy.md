# Holograms.Media Deployment Strategy

**Report ID:** [20241201-DEPLOY-STRATEGY]
**Update Date:** 2025-09-26
**Purpose:** Description of the current deployment strategy for the holograms.media project using modern cloud infrastructure.

## Current Infrastructure Overview

The holograms.media project uses a distributed cloud architecture:

* **Frontend:** Cloudflare Pages (Global CDN deployment)
* **Backend:** Koyeb (Containerized FastAPI deployment)
* **Database:** Astra Database (Cassandra NoSQL)
* **File Storage:** Backblaze B2 (Object storage)
* **Additional Services:** Cloudflare Workers, Cloudflare R2

## Deployment Components

### 1. Frontend (Cloudflare Pages)

**Code Location:** Root directory of the project
**Build:** Automatic via Cloudflare Pages
**Features:**
- Global distribution via CDN
- Automatic SSL
- Git integration (automatic deploy on push to main)
- Optimized for SPA (Single Page Application)

### 2. Backend (Koyeb)

**Code Location:** `backend/` directory
**Technology:** FastAPI + Docker
**Database:** Astra Database (Cassandra)
**Storage:** Backblaze B2

**Backend Structure:**
```
backend/
├── app.py                 # Main FastAPI application
├── api/v1/               # API endpoints version 1
├── core/                 # Application core
├── services/             # Business logic
├── models/               # Data models
├── routers/              # API routes
├── tria_agents/            # AI agents
└── requirements.txt      # Python dependencies
```

### 3. Database (Astra Database)

**Type:** Cassandra NoSQL
**Usage:** 
- User data storage
- Hologram metadata
- Interaction history
- User settings

### 4. File Storage (Backblaze B2)

**Purpose:** Storage of media files and chunks
**Structure:**
```
user_chunks/{user_id}/{uuid_filename}
hologram_data/{hologram_id}/{version}/{filename}
```

## Deployment Process

### Automatic Deployment

1. **Frontend:**
   - Push to `main` branch
   - Cloudflare Pages automatically builds and deploys
   - Available via HTTPS with global CDN

2. **Backend:**
   - Docker image is built automatically
   - Deployed on Koyeb
   - Autoscaling based on load

### Manual Deployment (if necessary)

```bash
# Build and run locally for testing
docker build -t holograms-backend .
docker run -p 8000:8000 holograms-backend

# Deploy to Koyeb via dashboard or CLI
koyeb services update holograms-backend --image your-registry/holograms-backend:latest
```

## Environment Variables

### Koyeb (Backend)
```
ASTRA_DB_APPLICATION_TOKEN=your_astra_token
ASTRA_DB_ID=your_astra_db_id
ASTRA_DB_REGION=your_region

BACKBLAZE_ACCESS_KEY=your_b2_access_key
BACKBLAZE_SECRET_KEY=your_b2_secret_key
BACKBLAZE_BUCKET_NAME=your_b2_bucket

MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key
```

### Cloudflare Pages (Frontend)
```
VITE_API_BASE_URL=https://your-koyeb-app.koyeb.app
VITE_WS_URL=wss://your-koyeb-app.koyeb.app
```

## Monitoring and Logging

- **Koyeb Dashboard:** Performance metrics, application logs
- **Cloudflare Analytics:** Traffic and performance analytics
- **Astra Dashboard:** Database metrics
- **Backblaze Dashboard:** Storage statistics

## Security

- All connections via HTTPS
- JWT tokens for authentication
- CORS settings for frontend
- Secret keys stored in environment variables
- Regular dependency updates

## Scaling

- **Horizontal:** Koyeb automatically scales instances
- **Vertical:** Ability to increase resources via dashboard
- **Global:** Cloudflare CDN ensures low latency

This strategy ensures a reliable, scalable, and secure deployment of the holograms.media application using modern cloud technologies.
