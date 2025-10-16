```markdown
# System Architecture

**Last Updated:** September 26, 2025

## Document Structure

### Core Architecture Documents
- **AudioVisualizationArchitecture.md** - Architecture of the audio-stream visualization system using CWT and Three.js
- **ModuleCatalog.MD** - Catalog of system modules with descriptions of their purposes and interactions
- **ModuleInterfaces.MD** - Specifications of interfaces between modules
- **NetHoloGlyph_Protocol_v1.md** - NetHoloGlyph protocol for data exchange between clients
- **SystemDescription.MD** - General description of the system and its components

### API Specifications
- **ApiSpecifications/ApiEndpointsV1Description.json** - API endpoints specification for version 1

### Infrastructure
- **Infrastructure/DeploymentStrategy.md** - System deployment strategy
- **Infrastructure/KoyebR2DeploymentGuide.md** - Deployment guide for Koyeb and Cloudflare R2
- **Infrastructure/WebGPUMigrationGuide.md** - Guide for migrating to WebGPU

## Implementation Status

### Completed Components
- ✅ WebRTC client for P2P data exchange (NetHoloGlyphClient)
- ✅ Server-side NetHoloGlyphService for message handling
- ✅ Integration with HologramRenderer for sending/receiving quanta
- ✅ Audio visualization system using CWT analysis
- ✅ Gesture control using MediaPipe Hands

### Components in Development
- 🔄 Migrating from JSON to Protocol Buffers for performance optimization
- 🔄 Generating protobuf files for Python and JavaScript
- 🔄 Implementing LZ4 compression for audio data

## Key Technologies

- **Frontend**: HTML5, CSS3, JavaScript ES6+, Three.js, WebGL, WebRTC
- **Backend**: Python (FastAPI), Node.js
- **Databases**: PostgreSQL, SQLite, Astra Database (Cassandra)
- **AI/ML**: TensorFlow.js, MediaPipe, WebRTC
- **Infrastructure**: Docker, Cloudflare Pages, Koyeb, Backblaze B2

## Links to Code

The architectural decisions in these documents map directly to the project's codebase. Main files to reference:
- `js/services/netHoloGlyphClient.js` - WebRTC client
- `backend/services/NetHoloGlyphService.py` - Server service
- `js/3d/hologramRenderer.js` - Hologram rendering
- `js/audio/waveletAnalyzer.js` - CWT audio analysis

```
