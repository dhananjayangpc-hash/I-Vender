# I-Vendor Production Deployment

This directory contains all files needed to deploy I-Vendor to production.

## Quick Reference

### Local Development

```powershell
cd ivendor-starter
docker compose up -d
cd backend && npm install && npm start
# in another terminal
npm run worker
cd frontend && npm install && npm run dev
```

### Build & Push Docker Images

The CI/CD pipeline (`/.github/workflows/ci.yml`) automatically builds and pushes images on push to main/develop.

Alternatively, build manually:

```powershell
cd ivendor-starter/backend
docker build -t ivendor-backend:latest .
docker tag ivendor-backend:latest ghcr.io/yourname/ivendor-backend:latest
docker push ghcr.io/yourname/ivendor-backend:latest

cd ../frontend
docker build -t ivendor-frontend:latest .
docker tag ivendor-frontend:latest ghcr.io/yourname/ivendor-frontend:latest
docker push ghcr.io/yourname/ivendor-frontend:latest
```

### Deploy to Kubernetes

```powershell
# Dev/staging
kubectl apply -k k8s/base/

# Production (with kustomize overlay)
kubectl apply -k k8s/overlays/prod/
```

See `k8s/README.md` for full deployment guide.

## Services

- **Backend API**: http://localhost:4000/api/v1 (local) or https://ivendor.example.com/api/v1 (prod)
- **Frontend**: http://localhost:5173 (dev) or https://ivendor.example.com (prod)
- **Worker**: Processes verification cases in background
- **Postgres**: Database (local: localhost:5432)
- **MinIO**: Object storage (local: localhost:9000, console: localhost:9001)

## Key Endpoints

- `GET /health` - Health check
- `POST /api/v1/tenants` - Create tenant
- `POST /api/v1/tenants/:tenantId/vendors` - Create vendor
- `POST /api/v1/tenants/:tenantId/vendors/:vendorId/documents` - Upload document (returns presigned URL)
- `GET /api/v1/tenants/:tenantId/verification/queue` - Get verification queue
- `POST /api/v1/tenants/:tenantId/verification/:caseId/resolve` - Resolve verification case
- `POST /webhooks/minio` - MinIO event webhook

## Architecture

- **Frontend**: React + Vite (SPA)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Object Storage**: S3-compatible (MinIO local, AWS S3 prod)
- **Verification**: Worker processes OCR/AI verification async
- **Events**: MinIO webhooks + manual `/documents/:id/complete`

## Configuration

See `.env.example` for all environment variables. For production, inject secrets via Kubernetes Secrets or external-secrets.

## Security

- JWT authentication tokens (15m lifetime)
- Webhook secret validation
- Role-based access control (RBAC) via OPA policies
- Encrypted secrets in Kubernetes
- TLS/SSL for all communication
- Audit logging for all operations

## Support & Troubleshooting

- Backend logs: `npm start` (dev) or `kubectl logs -f deployment/ivendor-backend` (prod)
- Worker logs: `npm run worker`
- DB: Adminer at http://localhost:8080 (dev)
- MinIO: http://localhost:9001 (dev)
- Check Postgres connection: `DATABASE_URL=postgresql://ivendor:ivendor@localhost:5432/ivendor psql` (dev)
