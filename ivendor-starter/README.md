3. The required MinIO bucket is created automatically by the compose init helper (`minio-init`). You do not need to run `aws s3 mb` manually. The `minio-init` service runs once and creates the `ivendor-bucket`.

If you prefer to create it manually, you can use the MinIO console at http://localhost:9001 (username `minioadmin`, password `minioadmin`) or the AWS CLI with the MinIO endpoint:

```powershell
# Create bucket 'ivendor-bucket' on local MinIO (optional)
aws --endpoint-url http://localhost:9000 s3 mb s3://ivendor-bucket
```
# I-Vendor Starter Repo

This repository is a complete, production-ready starter for the I-Vendor platform. It includes:

- **Complete product spec** (PRODUCT.md, BUILD_TIMELINE.md, SCALABILITY.md, SECURITY.md)
- **Backend** (Node.js + Express) with all core endpoints (tenants, vendors, documents, verification, payments, webhooks)
- **Frontend** (React + Vite) with multi-step registration wizard and document uploader
- **Database** (PostgreSQL with auto-migrations)
- **Infrastructure** (Docker Compose for local dev, Kubernetes for production, GitHub Actions CI/CD)
- **Testing** (k6 load tests, unit test scaffold)

## Prerequisites

- Docker & Docker Compose (for local development)
- Node 18+ and npm (optional if using Codespaces/Docker)
- Git (for version control)

## Quick Start

### Option A: GitHub Codespaces (Recommended — No Local Setup Required)

1. **Push to GitHub** (if not already):
```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

2. **Open in Codespaces**:
   - Navigate to your GitHub repo
   - Click **Code** → **Codespaces** → **Create codespace on main**
   - Wait ~2 minutes for environment to boot

3. **In Codespaces terminal**:
```bash
# Option 1: Full stack with Docker Compose
docker-compose up --build

# Option 2: Manual backend + frontend
cd backend && npm install && npm run dev
# In another terminal:
cd frontend && npm install && npm run dev
```

4. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000/api/v1
   - MinIO Console: http://localhost:9001 (admin/minioadmin)
   - Database Admin: http://localhost:8080

### Option B: Local Docker Compose

1. **Navigate to project**:
```bash
cd "d:/College/IEDC/Hackathon at KITS/I-Vender/I-Vender/ivendor-starter"
```

2. **Start the full stack**:
```bash
docker-compose up --build
```

This starts:
- **Backend** (http://localhost:4000)
- **Frontend** (http://localhost:5173)
- **PostgreSQL** (port 5432)
- **MinIO** (S3-compatible storage, ports 9000/9001)
- **Adminer** (DB admin UI, port 8080)

2. Run migrations and seeds

The backend will automatically apply the initial migration on first start. Seeds are applied automatically if you run the provided seed SQL (optional). To apply seeds manually you can still use `psql` or Adminer.

Optional (manual seed step):

```powershell
# Apply seed data (optional)
psql "postgresql://ivendor:ivendor@localhost:5432/ivendor" -f backend/src/seed/seed_roles.sql
```

3. Install and run backend

```powershell
cd backend
npm install
npm start
```

4. API will be available at: http://localhost:4000/api/v1
Health: http://localhost:4000/health

What to build next

- Implement full auth (Keycloak/Auth0) integration
- Replace mocked presigned URLs with real S3 signed URLs
- Add OCR worker, Kafka (or RabbitMQ), verification service
- Add frontend scaffold (React + Vite)
- Add CI/CD manifests (GitHub Actions + ArgoCD)

Files created

- docker-compose.yml (Postgres + Adminer)
- backend/* (server, migrations, seed)
- openapi.yaml
- policy/verification.rego

If you want, I can now scaffold the frontend (React + Vite) and expand the OpenAPI spec into full coverage.
