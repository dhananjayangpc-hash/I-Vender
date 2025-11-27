# I-Vender Phase-4: Launcher Guide

**Complete documentation for the launch-complete.sh orchestration script**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Command Reference](#command-reference)
5. [Health Checks](#health-checks)
6. [Seed Data Management](#seed-data-management)
7. [Service Orchestration](#service-orchestration)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Usage](#advanced-usage)

---

## Overview

The `launch-complete.sh` script is a professional-grade orchestration tool that:

- **Validates** Docker installation and daemon
- **Manages** Docker Compose services
- **Monitors** service health and readiness
- **Populates** test data automatically
- **Reports** status with color-coded output
- **Handles** all startup/shutdown scenarios

### Key Features

✓ **Full Automation**: One command to deploy the entire platform  
✓ **Health Monitoring**: Ensures all services are ready before proceeding  
✓ **Flexible Modes**: Full setup, empty setup, reset, stop, status  
✓ **Professional Output**: Color-coded logs and progress indicators  
✓ **Error Handling**: Graceful failure with helpful messages  
✓ **Port Detection**: Checks port availability  
✓ **Database Seeding**: Automatic population with realistic test data  

---

## Requirements

### System Requirements
- Linux/macOS (Windows with WSL2)
- Bash 4.0+
- Docker 20.10+
- Docker Compose 1.29+
- Git
- PostgreSQL client tools (optional, for direct DB access)
- `curl` for health checks
- `lsof` for port checking

### Software Stack
- PostgreSQL 13+
- Node.js 18+
- React 18+
- MinIO S3-compatible storage

### Disk Space
- Minimum: 5GB
- Recommended: 10GB

### Memory
- Minimum: 4GB RAM available
- Recommended: 8GB+ RAM

---

## Installation

### 1. Clone or Navigate to Repository

```bash
cd /workspaces/I-Vender/ivendor-starter
```

### 2. Make Script Executable

```bash
chmod +x launch-complete.sh
```

### 3. Verify Script is Accessible

```bash
./launch-complete.sh --help
```

You should see the help menu with all available commands.

### 4. Ensure docker-compose.yml Exists

```bash
ls -la docker-compose.yml
```

The file should be in the same directory as `launch-complete.sh`.

---

## Command Reference

### 1. Full Launch (Default)

**Command:**
```bash
./launch-complete.sh
# or
./launch-complete.sh --full
```

**What it does:**
- ✓ Checks Docker and Docker Compose
- ✓ Validates port availability
- ✓ Starts all services via Docker Compose
- ✓ Waits for database to be ready
- ✓ Waits for backend to be healthy
- ✓ Populates test data automatically
- ✓ Displays service URLs and credentials

**Expected output:**
```
✓ Docker and Docker Compose are installed
✓ Docker daemon is running
✓ Port 4000 available (Backend)
✓ Port 5173 available (Frontend)
...
✓ Seed data populated successfully

✓ ALL SERVICES RUNNING

Service URLs:
  Frontend:     http://localhost:5173
  Backend:      http://localhost:4000
  DB Admin:     http://localhost:8080
  MinIO:        http://localhost:9001
```

**Startup time:** 2-3 minutes (first time), 30-60s (subsequent)

---

### 2. Empty Setup (No Data)

**Command:**
```bash
./launch-complete.sh --empty
```

**What it does:**
- ✓ Starts all services
- ✓ Does NOT populate seed data
- ✓ Leaves database empty for manual testing

**Use cases:**
- Testing data import functionality
- Working with custom datasets
- Integration testing
- Fresh database state

---

### 3. Reset & Repopulate

**Command:**
```bash
./launch-complete.sh --reset
```

**What it does:**
- ✓ Starts Docker Compose services
- ✓ Truncates all tables
- ✓ Recreates schema from migration
- ✓ Populates fresh test data
- ✓ Useful for reproducible state

**Use cases:**
- Starting fresh after modifications
- Testing data reset functionality
- Cleaning corrupted data
- Demo/testing reset

**Data Loss Warning:** ⚠️ This command **deletes all existing data**.

---

### 4. Stop Services

**Command:**
```bash
./launch-complete.sh --stop
```

**What it does:**
- ✓ Gracefully stops all Docker Compose services
- ✓ Preserves data (unlike --reset)
- ✓ Cleans up containers

**Use cases:**
- End of work session
- Resource cleanup
- Restarting with different configuration
- System maintenance

---

### 5. Service Status

**Command:**
```bash
./launch-complete.sh --status
```

**What it does:**
- ✓ Lists all running Docker containers
- ✓ Checks backend API health
- ✓ Checks database connectivity
- ✓ Reports seed data count
- ✓ Shows overall system status

**Example output:**
```
📊 SERVICE STATUS

Docker Containers:
NAME                    STATUS              PORTS
ivendor_backend_1       Up 2 minutes        0.0.0.0:4000->4000/tcp
ivendor_frontend_1      Up 2 minutes        0.0.0.0:5173->5173/tcp
ivendor_postgres_1      Up 3 minutes        0.0.0.0:5432->5432/tcp
ivendor_minio_1         Up 3 minutes        0.0.0.0:9000->9000/tcp, 9001/tcp
ivendor_adminer_1       Up 3 minutes        0.0.0.0:8080->8080/tcp

Service Health:
✓ Backend API is running
✓ PostgreSQL database is running
✓ Seed data is populated (28 records)
```

---

### 6. Help

**Command:**
```bash
./launch-complete.sh --help
```

**Displays:**
- ✓ All available commands
- ✓ Usage examples
- ✓ Service ports
- ✓ Credentials
- ✓ Documentation links

---

## Health Checks

The launcher performs comprehensive health checks:

### Docker Validation

```bash
# Check if Docker is installed
docker --version

# Check if Docker daemon is running
docker ps
```

### Database Health Check

```bash
# Script uses pg_isready
pg_isready -h localhost -p 5432 -U postgres

# Or manually test connection
psql -h localhost -U postgres -d ivendor -c "SELECT 1"
```

### Backend Health Endpoint

```bash
# Default health endpoint
curl http://localhost:4000/health

# Response indicates backend is running
{"status":"ok","service":"I-Vender Campus Platform"}
```

### Port Availability

```bash
# Script checks using lsof
lsof -Pi :4000 -sTCP:LISTEN -t

# If nothing is output, port is available
```

### Timeout Configuration

- **Database wait**: 60 seconds
- **Backend wait**: 120 seconds
- **Health check interval**: 2 seconds

To modify timeouts, edit these lines in script:

```bash
HEALTH_CHECK_TIMEOUT=120    # Max 2 minutes
HEALTH_CHECK_INTERVAL=2     # Check every 2 seconds
```

---

## Seed Data Management

### Automatic Population

During `--full` or `--reset`, the script automatically calls:

```bash
curl -X POST http://localhost:4000/api/v1/seed/populate
```

This inserts 28 records across:

- **5 Vendors** (companies)
- **6 Projects** (with budgets ₹75K–₹320K)
- **5 Team Members** (experts/alumni)
- **4 Institutions** (universities/bootcamps)
- **4 Requests** (collaboration proposals)
- **4 Documents** (vendor verification files)

### Check Seed Status

```bash
curl http://localhost:4000/api/v1/seed/status
```

### Manual Seed Operations

If needed, you can manually trigger seed operations:

```bash
# Populate data
curl -X POST http://localhost:4000/api/v1/seed/populate

# Reset database and repopulate
curl -X DELETE http://localhost:4000/api/v1/seed/reset

# Check current status
curl http://localhost:4000/api/v1/seed/status
```

### Seed Data Details

**Vendors:**
- TechVision (AI/ML software, ₹85K–₹320K)
- GlobalServe Solutions (Consulting, ₹120K–₹450K)
- NexaWorks (Product Dev, ₹75K–₹280K)
- AlphaEdge (Research/Quantum, ₹150K–₹500K)
- BrightPath Systems (Infrastructure, ₹95K–₹350K)

**Projects:**
- AI-Powered Customer Analytics (₹185K, 16 weeks)
- Mobile Campus Management (₹125K, 12 weeks)
- Blockchain Supply Chain (₹245K, 20 weeks)
- Cloud Migration (₹195K, 14 weeks)
- IoT Sensor Network (₹210K, 18 weeks)
- Enterprise Data Warehouse (₹180K, 15 weeks)

---

## Service Orchestration

### Docker Compose Workflow

The script uses Docker Compose to manage services:

```yaml
Services:
  ├── postgres       (PostgreSQL database)
  ├── adminer        (DB admin UI)
  ├── minio          (Object storage)
  ├── backend        (Node.js/Express)
  └── frontend       (React/Vite)
```

### Service Dependencies

```
frontend (5173)
    ↓ (API calls)
backend (4000)
    ↓ (SQL queries)
postgres (5432)

minio (9000/9001)
    ↑ (Object storage)
backend
```

### Container Naming

Containers follow pattern: `ivendor_<service>_<replica>`

Example:
```
ivendor_backend_1
ivendor_postgres_1
ivendor_frontend_1
ivendor_minio_1
ivendor_adminer_1
```

### Networking

All services communicate via Docker internal network `ivendor_default`:

- Backend → Database: `postgres:5432`
- Backend → MinIO: `minio:9000`
- Frontend → Backend: `http://localhost:4000`

---

## Troubleshooting

### Port Already in Use

**Problem:** `Port 4000 already in use`

**Solution:**
```bash
# Find process using port
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or kill directly
lsof -ti :4000 | xargs kill -9

# Restart launcher
./launch-complete.sh
```

### Docker Daemon Not Running

**Problem:** `Docker daemon is not running`

**Solution:**
```bash
# macOS/Windows
# Start Docker Desktop application

# Linux
sudo systemctl start docker

# Verify
docker ps
```

### Docker Compose Not Found

**Problem:** `docker-compose not installed`

**Solution:**
```bash
# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

### Timeout: Database Not Ready

**Problem:** `PostgreSQL failed to become ready`

**Solution:**
```bash
# Check container logs
docker logs ivendor_postgres_1

# Restart database
docker-compose restart postgres

# Or full restart
./launch-complete.sh --stop
./launch-complete.sh
```

### Backend Health Check Failing

**Problem:** `Backend API failed to become ready`

**Solution:**
```bash
# Check backend logs
docker logs ivendor_backend_1

# Verify database connection
psql -h localhost -U postgres -d ivendor -c "SELECT 1"

# Restart backend
docker-compose restart backend
```

### Seed Data Not Populated

**Problem:** Database empty after launch

**Solution:**
```bash
# Check seed status
curl http://localhost:4000/api/v1/seed/status

# Manually populate
curl -X POST http://localhost:4000/api/v1/seed/populate

# Or reset and repopulate
curl -X DELETE http://localhost:4000/api/v1/seed/reset
```

### Out of Disk Space

**Problem:** Docker build fails due to disk space

**Solution:**
```bash
# Clean up unused Docker resources
docker system prune -a --volumes

# Check disk usage
df -h

# Remove old images
docker images prune
```

### Memory Issues

**Problem:** Services crash or become unresponsive

**Solution:**
```bash
# Increase Docker memory limit
# macOS/Windows: Docker Desktop → Settings → Resources → Memory (increase to 8GB+)
# Linux: System configuration needed

# Or restart with fewer services
./launch-complete.sh --stop
docker-compose up -d postgres backend
```

---

## Advanced Usage

### Environment Variables

Create `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ivendor
DB_USER=postgres
DB_PASSWORD=postgres

# Backend
PORT=4000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:4000/api/v1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Seed
SEED_POPULATE_ON_START=true
```

### Custom Docker Compose

Edit `docker-compose.yml` to:

- Change port mappings
- Adjust resource limits
- Add additional services
- Modify environment variables

Then restart:

```bash
./launch-complete.sh --stop
./launch-complete.sh
```

### Manual Docker Control

While launcher is convenient, you can also use Docker directly:

```bash
# Start services manually
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Access database directly
docker exec -it ivendor_postgres_1 psql -U postgres -d ivendor

# Rebuild images
docker-compose build --no-cache
```

### Debugging Mode

Add debug output to script:

```bash
# Add this line to launch-complete.sh after set -e
set -x  # Enable debugging output

# Then run
./launch-complete.sh
```

### Custom Seed Data

To use custom seed data:

1. Edit `backend/src/seed-data.js`
2. Modify vendor/project/team member objects
3. Run reset command:

```bash
./launch-complete.sh --reset
```

---

## Performance Optimization

### First-Time Startup

Initial startup takes 2-3 minutes due to:
- Docker image pulls (if not cached)
- Database initialization
- Backend compilation
- Frontend bundling

### Subsequent Startups

Only 30-60 seconds because:
- Images already cached
- Database exists
- Services restart quickly

### Optimize Further

```bash
# Pre-pull images
docker-compose pull

# Pre-build images
docker-compose build

# Increase resource allocation
# Edit docker-compose.yml and add resources limits

# Use local volumes for faster I/O
docker volume create ivendor_postgres_data
```

---

## Logs & Monitoring

### Log Locations

```bash
# Launcher logs
cat .launcher-logs/docker-compose.log

# Docker container logs
docker logs ivendor_backend_1
docker logs ivendor_postgres_1
docker logs ivendor_frontend_1

# Docker Compose full logs
docker-compose logs -f
```

### Monitor in Real-Time

```bash
# Watch all services
docker-compose logs -f

# Watch specific service
docker-compose logs -f backend

# Watch with timestamps
docker-compose logs --timestamps

# Last 100 lines
docker-compose logs --tail=100
```

---

## Security Considerations

### Default Credentials

⚠️ **Never use defaults in production:**

```
Database:   postgres / postgres
MinIO:      minioadmin / minioadmin
```

### Change Credentials

1. Edit `.env` or `docker-compose.yml`
2. Rebuild containers
3. Reset database

### Network Security

- Services are exposed on localhost only
- No external access by default
- Use firewall rules for additional protection

### Data Protection

- Backup database before major operations
- Use `--reset` carefully (deletes data)
- Keep PostgreSQL password secure

---

## Advanced Scenarios

### CI/CD Integration

For automated deployments:

```bash
# In CI pipeline
./launch-complete.sh --empty
# Run tests
# Cleanup
./launch-complete.sh --stop
```

### Development Workflow

```bash
# Start fresh day
./launch-complete.sh

# Code during day
# Make changes, test...

# End of day cleanup
./launch-complete.sh --stop
```

### Multi-Environment Testing

```bash
# Production-like test
./launch-complete.sh

# Test data import
./launch-complete.sh --empty
# Load custom data
./launch-complete.sh --reset
```

---

## FAQ

**Q: How long does first startup take?**
A: 2-3 minutes. Subsequent startups take 30-60 seconds.

**Q: Can I modify seed data?**
A: Yes, edit `backend/src/seed-data.js` then run `--reset`.

**Q: What if a port is in use?**
A: Kill the process or change port in `docker-compose.yml`.

**Q: How do I access the database?**
A: Use Adminer at http://localhost:8080 or direct psql connection.

**Q: Can I use this in production?**
A: No, add authentication, SSL, backups, and security configurations first.

**Q: How do I backup data?**
A: Use `docker-compose exec postgres pg_dump` or Adminer export.

---

**For API details, see `openapi.yaml`**  
**For implementation details, see `PHASE_4_IMPLEMENTATION.md`**  
**For quick start, see `QUICK_LAUNCH.md`**

---

*Last Updated: January 2025 | I-Vender Phase-4*
