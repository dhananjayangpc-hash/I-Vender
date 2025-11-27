# I-Vender Phase-4: Quick Launch Guide

**⏱️ 5-minute setup to run the complete platform**

---

## 🚀 One-Command Launch

```bash
cd /workspaces/I-Vender/ivendor-starter
./launch-complete.sh
```

**That's it!** All services will start automatically with test data.

---

## 📍 Service URLs (After Launch)

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| **Frontend** | http://localhost:5173 | - |
| **Backend API** | http://localhost:4000 | - |
| **Database Admin** | http://localhost:8080 | `postgres` / `postgres` |
| **MinIO Console** | http://localhost:9001 | `minioadmin` / `minioadmin` |

---

## ✅ Quick Health Check

Once launched, verify all services are running:

```bash
# Backend health
curl http://localhost:4000/health

# Seed data status
curl http://localhost:4000/api/v1/seed/status

# Database connection
psql -h localhost -U postgres -d ivendor -c "SELECT COUNT(*) FROM vendors;"
```

---

## 🎮 Common Commands

### Start with Full Setup (Default)
```bash
./launch-complete.sh
```

### Start WITHOUT Test Data
```bash
./launch-complete.sh --empty
```

### Reset & Repopulate Data
```bash
./launch-complete.sh --reset
```

### Stop All Services
```bash
./launch-complete.sh --stop
```

### Check Service Status
```bash
./launch-complete.sh --status
```

### Display Help
```bash
./launch-complete.sh --help
```

---

## 🌐 Browser Access

After launching:

1. **Frontend App**: Open http://localhost:5173
2. **Database Admin**: Open http://localhost:8080
   - User: `postgres`
   - Password: `postgres`
   - Server: `postgres`
3. **MinIO Storage**: Open http://localhost:9001
   - User: `minioadmin`
   - Password: `minioadmin`

---

## 📊 Test Data Overview

After launch, the database contains:

- **5 Vendors** (companies)
- **6 Projects** (with budgets: ₹75K–₹320K)
- **5 Team Members** (alumni/experts)
- **4 Institutions** (universities, polytechnics, bootcamps)
- **4 Requests** (collaboration proposals)
- **4 Documents** (vendor verification)

**Total: 28 realistic records** ready for testing.

---

## 🔧 API Quick Tests

### Get Seed Data Status
```bash
curl http://localhost:4000/api/v1/seed/status
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-20T10:30:00Z",
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

### Reset Database
```bash
curl -X DELETE http://localhost:4000/api/v1/seed/reset
```

### Populate Data (if empty)
```bash
curl -X POST http://localhost:4000/api/v1/seed/populate
```

---

## 🔍 Logs & Debugging

Logs are stored in `.launcher-logs/` directory:

```bash
# View launcher logs
cat .launcher-logs/docker-compose.log

# Check if logs directory exists
ls -la .launcher-logs/
```

---

## 📱 Database Credentials

```
Host: localhost
Port: 5432
User: postgres
Password: postgres
Database: ivendor
```

**Connect from terminal:**
```bash
psql -h localhost -U postgres -d ivendor
```

---

## 🛑 Stopping Services

To stop all running services:

```bash
./launch-complete.sh --stop
```

Or manually:
```bash
docker-compose down
```

---

## ⚡ Startup Timeline

| Step | Duration | Action |
|------|----------|--------|
| Docker startup | 15-30s | Containers initialize |
| Database ready | 30-45s | PostgreSQL boots |
| Backend init | 10-15s | Express app starts |
| Frontend ready | 10s | Vite dev server starts |
| Seed data | 5-10s | Database populated |
| **TOTAL** | **~2-3 min** | All services live |

---

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill process using port 4000
lsof -ti :4000 | xargs kill -9

# Then restart
./launch-complete.sh
```

### Docker Not Running
```bash
# On macOS/Windows: Start Docker Desktop
# On Linux: Start Docker daemon
sudo systemctl start docker
```

### Database Connection Failed
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# View container logs
docker logs <container_id>
```

### Services Won't Start
```bash
# Full reset
./launch-complete.sh --stop
docker-compose pull
./launch-complete.sh
```

---

## 📚 Next Steps

For detailed information:

- **Complete Setup Guide**: See `LAUNCHER_GUIDE.md`
- **Technical Details**: See `PHASE_4_IMPLEMENTATION.md`
- **API Documentation**: See `openapi.yaml`
- **Architecture Overview**: See `PHASE_4_README.md`

---

## 🎯 What's Included

✅ PostgreSQL Database  
✅ Node.js/Express Backend  
✅ React Frontend  
✅ MinIO Object Storage  
✅ Database Admin UI (Adminer)  
✅ 28 Test Data Records  
✅ Seed Management APIs  
✅ Health Monitoring  
✅ Docker Orchestration  
✅ Professional Launcher Script  

---

**Created for I-Vender Phase-4 | Enterprise Partnership Platform**
