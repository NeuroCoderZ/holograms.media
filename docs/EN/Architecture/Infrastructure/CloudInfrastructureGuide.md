```markdown
# Holograms.Media Infrastructure Guide

**Last Updated:** September 26, 2025

This guide describes the current infrastructure of the holograms.media project, which uses modern cloud services to ensure high performance and scalability.

## 1. Infrastructure Overview

The holograms.media project is built on a distributed cloud architecture:

* **Frontend:** Cloudflare Pages with global CDN
* **Backend:** Koyeb with containerized FastAPI
* **Database:** Astra Database (Cassandra NoSQL)
* **File Storage:** Backblaze B2
* **Additional Services:** Cloudflare Workers, Cloudflare R2

## 2. Database - Astra Database

### 2.1. Astra Database Overview

Astra Database is a cloud database based on Apache Cassandra, provided by DataStax.

**Key features:**
- Globally distributed NoSQL database
- Automatic scaling
- High availability and performance
- Compatible with Cassandra Query Language (CQL)

### 2.2. Usage in the Project

**Main tables:**
- `users` - user data
- `holograms` - hologram metadata
- `chunks` - media chunk information
- `interactions` - user interaction history

**Connection example:**
```python
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider

cloud_config = {
    'secure_connect_bundle': 'path/to/secure-connect-bundle.zip'
}
auth_provider = PlainTextAuthProvider(
    username='client_id',
    password='client_secret'
)
cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
session = cluster.connect('keyspace_name')
```

## 3. File Storage - Backblaze B2

### 3.1. Backblaze B2 Overview

Backblaze B2 is an object storage with S3-compatible API, optimized for storing large amounts of data.

**Advantages:**
- Low storage cost
- High reliability
- S3-compatible API
- Global CDN integration

### 3.2. Storage Structure

```
user_chunks/
├── {user_id}/
│   ├── {uuid}_chunk_001.mp4
│   ├── {uuid}_chunk_002.mp4
│   └── ...

hologram_data/
├── {hologram_id}/
│   ├── v1/
│   │   ├── metadata.json
│   │   └── processed_data.bin
│   └── v2/
│       └── ...
```

### 3.3. Working with B2 API

```python
import boto3

# Initialize client
s3_client = boto3.client(
    service_name='s3',
    endpoint_url='https://s3.us-west-002.backblazeb2.com',
    aws_access_key_id='your_access_key',
    aws_secret_access_key='your_secret_key'
)

# Upload file
s3_client.upload_fileobj(
    file_obj,
    'your-bucket-name',
    f'user_chunks/{user_id}/{filename}',
    ExtraArgs={'ContentType': 'video/mp4'}
)
```

## 4. Compute Resources - Koyeb

### 4.1. Koyeb Overview

Koyeb is a platform for deploying containerized applications with automatic scaling.

**Features:**
- Automatic scaling
- Global deployment
- Docker integration
- Built-in load balancer

### 4.2. FastAPI Deployment

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Service configuration:**
- Automatic deploy from Git
- Environment variables for configuration
- Health checks for monitoring

## 5. Frontend - Cloudflare Pages

### 5.1. Cloudflare Pages Overview

Cloudflare Pages provides static site hosting with global CDN.

**Advantages:**
- Global distribution
- Automatic SSL
- Git integration
- Free tier for small projects

### 5.2. Build and Deployment

**Build is automatic:**
- On push to the main branch
- Uses Node.js and npm/yarn
- Production optimization

**Configuration:**
```yaml
# _headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

# _redirects
/api/*  https://your-koyeb-app.koyeb.app/api/:splat  200
```

## 6. Monitoring and Analytics

### 6.1. Koyeb Dashboard
- Performance metrics
- Application logs
- Resource monitoring
- Automatic alerts

### 6.2. Cloudflare Analytics
- Traffic analytics
- Site performance
- User distribution
- Security

### 6.3. Astra Dashboard
- Database metrics
- Query performance
- Resource usage
- Error monitoring

## 7. Security

### 7.1. Authentication and Authorization
- JWT tokens for API
- OAuth 2.0 for external services
- Role-based access model

### 7.2. Data Encryption
- HTTPS for all connections
- Data encryption in transit
- Secure secret storage

### 7.3. Access Control
- CORS policy
- Rate limiting
- Input validation

## 8. Scalability

### 8.1. Horizontal Scaling
- Koyeb automatically adds instances as load increases
- Load balancing across regions
- CDN-level caching

### 8.2. Vertical Scaling
- Ability to increase resources via dashboard
- Database query optimization
- Data caching

### 8.3. Performance Optimization
- Lazy loading of resources
- Code splitting
- Image optimization
- CDN for static files

This infrastructure ensures reliable, scalable, and secure operation of the holograms.media application using best practices in cloud technologies.

```
