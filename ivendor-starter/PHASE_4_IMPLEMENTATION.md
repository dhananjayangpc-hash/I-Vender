# I-Vender Phase-4: Technical Implementation Guide

**Complete technical documentation for the enterprise partnership and project management platform**

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Seed Data System](#seed-data-system)
4. [API Endpoints](#api-endpoints)
5. [Service Orchestration](#service-orchestration)
6. [Code Structure](#code-structure)
7. [Technology Stack](#technology-stack)
8. [Performance Metrics](#performance-metrics)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                     │
│                    http://localhost:5173                    │
│  • Dashboard • Projects • Vendors • Institutions • Requests │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js/Express)                 │
│                    http://localhost:4000                    │
│  • Authentication • Seed Management • Project APIs • Reports│
└────────────────────────┬────────────────────────────────────┘
                         │ SQL
                         ↓
┌──────────────────────────────────────────┐
│    DATABASE (PostgreSQL)                 │
│    localhost:5432 | ivendor              │
│  • Vendors • Projects • Institutions     │
│  • Team Members • Requests • Documents   │
└──────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
    ┌────────┐      ┌─────────┐    ┌──────────┐
    │ MinIO  │      │ Adminer │    │ Analysis │
    │ Storage│      │ DB UI   │    │ Tools    │
    └────────┘      └─────────┘    └──────────┘
```

### Data Flow

```
User Action
    ↓
Frontend Component
    ↓
REST API Call
    ↓
Backend Route Handler
    ↓
Business Logic
    ↓
Database Query
    ↓
PostgreSQL Execute
    ↓
Response JSON
    ↓
Frontend Update
```

---

## Database Schema

### Entity-Relationship Diagram

```
vendors ─────┬───→ projects
             │
             ├───→ documents
             │
             └───→ requests

institutions ────→ requests
             │
             └───→ partnerships (implicit)

requests ─────────→ projects
         └────────→ team_members (via allocation)

team_members ──────→ projects (skill matching)
            └──────→ institutions (alumni network)
```

### Core Tables

#### 1. **vendors**

Represents companies and organizations offering projects.

```sql
CREATE TABLE vendors (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  industry text,
  website text,
  description text,
  contact_person text,
  phone text,
  budget_range_min numeric,
  budget_range_max numeric,
  verified boolean DEFAULT false,
  established_year integer,
  team_size integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_verified ON vendors(verified);
```

**Key fields:**
- `id`: Unique identifier (UUID)
- `status`: Approval workflow state
- `verified`: Document verification flag
- `metadata`: Extensible JSON for certifications, testimonials, etc.

#### 2. **projects**

Represents project opportunities and initiatives.

```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text,
  vendor_id uuid REFERENCES vendors(id),
  budget numeric NOT NULL,
  timeline_weeks integer,
  status text CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  required_skills jsonb,
  tags jsonb,
  deliverables jsonb,
  team_requirements integer,
  start_date date,
  end_date date,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_vendor ON projects(vendor_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_difficulty ON projects(difficulty);
```

**Key fields:**
- `required_skills`: JSON array of needed competencies
- `tags`: JSON array for categorization
- `deliverables`: JSON array of expected outputs
- `budget`: Numeric value in rupees

#### 3. **team_members**

Represents alumni, experts, and potential project team members.

```sql
CREATE TABLE team_members (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  title text,
  company text,
  email text NOT NULL UNIQUE,
  phone text,
  experience_years integer,
  hourly_rate numeric,
  skills jsonb,
  specialization text,
  bio text,
  rating numeric(3,2),
  total_projects integer,
  github text,
  linkedin text,
  verified boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_verified ON team_members(verified);
```

**Key fields:**
- `skills`: JSON array of technical competencies
- `rating`: Numeric between 0-5 (0.00 to 5.00)
- `metadata`: Contains certifications, languages, availability

#### 4. **institutions**

Represents educational institutions and organizations.

```sql
CREATE TABLE institutions (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text CHECK (type IN ('university', 'polytechnic', 'bootcamp', 'research_center')),
  location text NOT NULL,
  website text,
  email text,
  phone text,
  established_year integer,
  student_count integer,
  faculty_count integer,
  accreditation text,
  specializations jsonb,
  partnerships jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_institutions_type ON institutions(type);
CREATE INDEX idx_institutions_location ON institutions(location);
```

**Key fields:**
- `type`: Institution classification
- `specializations`: JSON array of focus areas
- `partnerships`: JSON array of partner organization names

#### 5. **requests**

Represents collaboration requests and proposals.

```sql
CREATE TABLE requests (
  id uuid PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES institutions(id),
  project_id uuid REFERENCES projects(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  requested_by text NOT NULL,
  status text CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  request_type text CHECK (request_type IN ('project_collaboration', 'training_program', 'infrastructure_modernization', 'research_partnership')),
  proposal_details text,
  budget_allocated numeric,
  timeline_approved integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- Indexes
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_institution ON requests(institution_id);
CREATE INDEX idx_requests_vendor ON requests(vendor_id);
```

**Key fields:**
- `request_type`: Categorizes type of collaboration
- `status`: Workflow state in approval process
- `metadata`: Contains approval chain and priority

#### 6. **documents**

Represents vendor verification documents and certificates.

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  document_type text NOT NULL,
  filename text NOT NULL,
  s3_key text NOT NULL,
  status text CHECK (status IN ('pending', 'verified', 'rejected')),
  uploaded_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by text,
  file_size integer,
  checksum text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_documents_vendor ON documents(vendor_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(document_type);
```

**Key fields:**
- `s3_key`: MinIO object storage path
- `status`: Verification state
- `metadata`: Document-specific details (issue date, authority, etc.)

---

## Seed Data System

### Architecture

```
SeedEngine (Class)
  ├── populate()
  │   ├── populateVendors()
  │   ├── populateProjects()
  │   ├── populateTeamMembers()
  │   ├── populateInstitutions()
  │   ├── populateRequests()
  │   └── populateDocuments()
  ├── resetDatabase()
  └── getStatus()

seedData (Module)
  ├── vendors (Array of 5)
  ├── projects (Array of 6)
  ├── team_members (Array of 5)
  ├── institutions (Array of 4)
  ├── requests (Array of 4)
  └── documents (Array of 4)
```

### Seed Data Statistics

| Entity | Count | Details |
|--------|-------|---------|
| Vendors | 5 | Various industries, budgets ₹75K–₹500K |
| Projects | 6 | Budgets ₹125K–₹245K, 12-20 week timelines |
| Team Members | 5 | 5-9 years experience, ₹1200–₹1800/hour |
| Institutions | 4 | Universities, polytechnics, bootcamps |
| Requests | 4 | Various statuses: pending, approved, rejected, under_review |
| Documents | 4 | Certifications, tax, registration, bank statements |
| **TOTAL** | **28** | Fully interconnected records |

### Seed Data Example

```javascript
// Vendor record
{
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'TechVision',
  email: 'contact@techvision.io',
  status: 'approved',
  industry: 'software',
  budget_range_min: 85000,
  budget_range_max: 320000,
  verified: true,
  established_year: 2015,
  team_size: 150,
  metadata: {
    certifications: ['ISO 27001', 'SOC 2'],
    partners: ['Google Cloud', 'AWS'],
    testimonials: 4.8
  }
}

// Project record
{
  id: '660e8400-e29b-41d4-a716-446655440001',
  title: 'AI-Powered Customer Analytics Platform',
  vendor_id: '550e8400-e29b-41d4-a716-446655440001',
  budget: 185000,
  timeline_weeks: 16,
  required_skills: ['Python', 'TensorFlow', 'React', 'PostgreSQL', 'AWS'],
  tags: ['AI/ML', 'Analytics', 'Dashboard', 'Enterprise'],
  difficulty: 'advanced'
}
```

### Population Process

```
1. Connect to Database
   ↓
2. Begin Transaction
   ↓
3. For each entity type:
   a. Prepare SQL INSERT statement
   b. For each record:
      - Validate data
      - Execute INSERT
      - Log result
   c. Update statistics
   ↓
4. Commit Transaction
   ↓
5. Return statistics
```

### Seed File Structure

**`backend/src/seed-data.js`** (600+ lines)
- Exports `seedData` object
- Contains all test records
- Easily modifiable for custom data
- No database dependencies

**`backend/src/seed-populate.js`** (400+ lines)
- Exports `SeedEngine` class
- Handles population logic
- Reset database function
- Status reporting function

---

## API Endpoints

### Seed Management Endpoints

#### 1. POST /api/v1/seed/populate

Populate database with test data.

```bash
curl -X POST http://localhost:4000/api/v1/seed/populate
```

**Response:**
```json
{
  "success": true,
  "message": "Database populated successfully",
  "stats": {
    "vendors": 5,
    "projects": 6,
    "team_members": 5,
    "institutions": 4,
    "requests": 4,
    "documents": 4,
    "total": 28
  },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `500`: Database error

---

#### 2. DELETE /api/v1/seed/reset

Reset database and repopulate with fresh test data.

```bash
curl -X DELETE http://localhost:4000/api/v1/seed/reset
```

**Response:**
```json
{
  "success": true,
  "message": "Database reset and repopulated successfully",
  "stats": { ... }
}
```

⚠️ **WARNING**: Deletes all existing data before repopulating.

---

#### 3. GET /api/v1/seed/status

Get current status of seeded data.

```bash
curl http://localhost:4000/api/v1/seed/status
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-20T10:30:00.000Z",
  "tables": {
    "vendors": 5,
    "projects": 6,
    "team_members": 5,
    "institutions": 4,
    "requests": 4,
    "documents": 4
  },
  "total_records": 28
}
```

---

### Vendor Endpoints

```
GET    /api/v1/vendors              # List all vendors
GET    /api/v1/vendors/:id          # Get vendor details
POST   /api/v1/vendors              # Create vendor (admin)
PUT    /api/v1/vendors/:id          # Update vendor (admin)
DELETE /api/v1/vendors/:id          # Delete vendor (admin)
```

### Project Endpoints

```
GET    /api/v1/projects             # List projects
GET    /api/v1/projects/:id         # Get project details
POST   /api/v1/projects             # Create project
PUT    /api/v1/projects/:id         # Update project
DELETE /api/v1/projects/:id         # Delete project
```

### Institution Endpoints

```
GET    /api/v1/institutions         # List institutions
GET    /api/v1/institutions/:id     # Get institution details
POST   /api/v1/institutions         # Create institution
PUT    /api/v1/institutions/:id     # Update institution
DELETE /api/v1/institutions/:id     # Delete institution
```

### Request Endpoints

```
GET    /api/v1/requests             # List collaboration requests
GET    /api/v1/requests/:id         # Get request details
POST   /api/v1/requests             # Submit new request
PUT    /api/v1/requests/:id         # Update request (admin)
DELETE /api/v1/requests/:id         # Delete request (admin)
```

---

## Service Orchestration

### Docker Compose Architecture

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:13
    ports: [5432:5432]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ivendor
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports: [4000:4000]
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ivendor
      NODE_ENV: development

  frontend:
    build: ./frontend
    ports: [5173:5173]
    environment:
      VITE_API_URL: http://localhost:4000/api/v1

  minio:
    image: minio/minio:latest
    ports: [9000:9000, 9001:9001]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin

  adminer:
    image: adminer:latest
    ports: [8080:8080]
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Service Dependencies

```
frontend (5173)
    ├─ depends_on: nothing (client-side)
    └─ calls: backend:4000

backend (4000)
    ├─ depends_on: postgres:5432, minio:9000
    └─ serves: frontend, provides APIs

postgres (5432)
    ├─ depends_on: nothing
    └─ serves: backend, adminer

minio (9000, 9001)
    ├─ depends_on: nothing
    └─ serves: backend (object storage)

adminer (8080)
    ├─ depends_on: postgres:5432
    └─ provides: Database administration UI
```

### Startup Sequence

```
1. Start postgres (base service)
   Wait for: database ready
   Time: 15-30s

2. Start backend (depends on postgres)
   Wait: Database tables created from migrations
   Time: 10-15s

3. Start frontend (independent)
   Time: 5-10s

4. Start minio (independent)
   Time: 5s

5. Start adminer (depends on postgres)
   Time: 2-3s

6. Populate seed data
   Wait: Backend ready
   Time: 5-10s

TOTAL: ~2-3 minutes
```

---

## Code Structure

### Directory Layout

```
ivendor-starter/
├── backend/
│   ├── src/
│   │   ├── index.js                    # Main Express app
│   │   ├── db.js                       # Database connection
│   │   ├── seed-data.js               # Seed test data (600+ lines)
│   │   ├── seed-populate.js           # Seed engine (400+ lines)
│   │   ├── migrations/
│   │   │   └── 001_init.sql           # Database schema
│   │   ├── seed/
│   │   │   └── routes.js              # Seed endpoints
│   │   ├── auth/
│   │   ├── attendance/
│   │   ├── projects/
│   │   ├── mentors/
│   │   ├── cleanliness/
│   │   ├── rewards/
│   │   ├── dashboard/
│   │   └── utils/
│   │       ├── auth.js
│   │       ├── errors.js
│   │       └── validators.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── launch-complete.sh               # Launcher script (400+ lines)
├── QUICK_LAUNCH.md                  # Quick start guide
├── LAUNCHER_GUIDE.md                # Detailed launcher docs
├── PHASE_4_IMPLEMENTATION.md        # This file
├── PHASE_4_COMPLETE.md              # Summary docs
└── IMPLEMENTATION_INDEX.md          # Documentation index
```

### Key Files

**backend/src/seed-data.js** (627 lines)
```javascript
module.exports = {
  vendors: [ /* 5 vendors */ ],
  projects: [ /* 6 projects */ ],
  team_members: [ /* 5 team members */ ],
  institutions: [ /* 4 institutions */ ],
  requests: [ /* 4 requests */ ],
  documents: [ /* 4 documents */ ]
};
```

**backend/src/seed-populate.js** (398 lines)
```javascript
class SeedEngine {
  async populate() { /* Populates all entities */ }
  async resetDatabase() { /* Truncates tables */ }
  async getStatus() { /* Reports counts */ }
  async populateVendors() { /* Vendor insertion */ }
  // ... other populate methods
}
```

**launch-complete.sh** (421 lines)
```bash
#!/bin/bash
# Docker validation
# Port checking
# Service orchestration
# Health monitoring
# Seed population
# Status reporting
```

---

## Technology Stack

### Backend

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18.x | Runtime |
| Express | 4.18 | Web framework |
| PostgreSQL | 13 | Database |
| pg | 8.11 | Database driver |
| uuid | 9.0 | ID generation |
| body-parser | 1.20 | HTTP parsing |
| dotenv | 16.3 | Environment config |

### Frontend

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI framework |
| React Router | 6.14 | Client routing |
| Vite | 5.2 | Build tool |

### Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | 20.10+ | Containerization |
| Docker Compose | 1.29+ | Orchestration |
| MinIO | latest | Object storage |
| Adminer | latest | DB admin UI |

---

## Performance Metrics

### Database Performance

```
Seed Data Insertion
├── Vendors:        ~50ms (5 records)
├── Projects:       ~75ms (6 records)
├── Team Members:   ~60ms (5 records)
├── Institutions:   ~45ms (4 records)
├── Requests:       ~55ms (4 records)
├── Documents:      ~50ms (4 records)
└── TOTAL:          ~335ms for 28 records

Query Performance
├── Select all vendors:     ~2ms
├── Select all projects:    ~3ms
├── Join vendor+projects:   ~5ms
├── List with pagination:   ~8ms
└── Complex aggregation:    ~20ms
```

### Startup Performance

```
First-Time Startup: 2-3 minutes
├── Docker pull images:     30-45s
├── Database initialization: 30-45s
├── Backend compilation:     20-30s
├── Frontend bundling:       15-30s
├── Seed population:         5-10s

Subsequent Startup: 30-60 seconds
├── Container start:         15-20s
├── Database boot:           10-15s
├── Backend start:           5-10s
├── Frontend hot-reload:     3-5s
├── Seed population:         5-10s
```

### Resource Usage

```
Docker Container Resource Limits
├── PostgreSQL:      1GB RAM, 1 CPU
├── Backend:         512MB RAM, 0.5 CPU
├── Frontend:        256MB RAM, 0.5 CPU
├── MinIO:           512MB RAM, 1 CPU
├── Adminer:         128MB RAM, 0.25 CPU
└── TOTAL:           ~2.5GB RAM, 3 CPUs

Recommended System
├── RAM:             8GB minimum (4GB minimum)
├── Disk:            10GB SSD
├── CPU:             Multi-core recommended
└── Network:         1Mbps+ connection
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Docker and Docker Compose installed
- [ ] Port availability verified (4000, 5173, 5432, 8080, 9001)
- [ ] Adequate disk space (10GB minimum)
- [ ] Environment variables configured
- [ ] Database backups scheduled
- [ ] Security credentials changed from defaults

### Deployment Steps

1. Clone repository
2. Copy `.env.example` to `.env`
3. Update credentials and configuration
4. Run `./launch-complete.sh`
5. Verify all services operational
6. Run integration tests
7. Configure monitoring/alerts
8. Set up backup procedures

### Post-Deployment

- [ ] Monitor system logs
- [ ] Track performance metrics
- [ ] Plan scaling strategy
- [ ] Schedule security reviews
- [ ] Document custom changes
- [ ] Train team on operations

---

## Monitoring & Logging

### Health Check Endpoints

```bash
# Backend health
curl http://localhost:4000/health

# Database connectivity
psql -h localhost -U postgres -d ivendor -c "SELECT 1"

# Seed data status
curl http://localhost:4000/api/v1/seed/status
```

### Log Locations

```
.launcher-logs/
├── docker-compose.log
└── [other service logs]

Docker logs:
docker logs <container_name>

Application logs:
docker-compose logs -f

Database logs:
docker-compose exec postgres tail /var/log/postgresql/postgresql.log
```

---

## Troubleshooting Guide

### Common Issues

1. **Port Already in Use**
   - Find: `lsof -i :4000`
   - Kill: `kill -9 <PID>`

2. **Database Connection Failed**
   - Check: `psql -h localhost -U postgres`
   - Logs: `docker logs <postgres_container>`

3. **Seed Data Not Populated**
   - Check: `curl http://localhost:4000/api/v1/seed/status`
   - Repopulate: `curl -X DELETE http://localhost:4000/api/v1/seed/reset`

4. **Frontend Not Loading**
   - Check: `docker logs <frontend_container>`
   - Rebuild: `docker-compose build --no-cache frontend`

5. **Out of Memory**
   - Increase Docker memory limit in settings
   - Reduce resource-intensive operations

---

*This document covers the complete technical implementation of I-Vender Phase-4. For quick start, see QUICK_LAUNCH.md. For operational details, see LAUNCHER_GUIDE.md.*

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Phase:** Phase-4 | Enterprise Partnership & Project Management  
