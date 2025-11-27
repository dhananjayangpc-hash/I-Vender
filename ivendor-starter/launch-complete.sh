#!/bin/bash

# I-Vendor Platform: Complete Launch Script
# Comprehensive setup with health checks and auto-seeding

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 I-Vendor Platform - Complete Launch                   ║"
echo "║   Idea Vending Machine for Engineering Students            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Functions
log() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

error() {
  echo -e "${RED}[✗]${NC} $1"
  exit 1
}

wait_for_service() {
  local service=$1
  local url=$2
  local retries=0
  
  log "Waiting for $service to be ready..."
  
  while [ $retries -lt $MAX_RETRIES ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      success "$service is ready"
      return 0
    fi
    retries=$((retries + 1))
    sleep $RETRY_INTERVAL
  done
  
  error "$service failed to start after ${MAX_RETRIES} attempts"
}

# Main execution
echo ""
log "Step 1: Checking prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker not installed"
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose not installed"
success "Docker and Docker Compose are available"

echo ""
log "Step 2: Building and starting services with Docker Compose..."
if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d; then
  success "Docker Compose services started"
else
  error "Failed to start Docker Compose services"
fi

echo ""
log "Step 3: Waiting for services to be ready..."
wait_for_service "PostgreSQL" "http://localhost:5432"
wait_for_service "Backend API" "http://localhost:3000/health"

echo ""
log "Step 4: Seeding database with test data..."
sleep 3
SEED_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/seed)
if echo "$SEED_RESPONSE" | grep -q "successfully"; then
  success "Database seeded with 35 ideas, 8 mentors, 10 vendors, 5 RBVM machines"
else
  error "Failed to seed database: $SEED_RESPONSE"
fi

echo ""
log "Step 5: Verifying data population..."
sleep 2
DASHBOARD=$(curl -s http://localhost:3000/api/v1/admin/dashboard)
if echo "$DASHBOARD" | grep -q "total_ideas"; then
  success "Platform is fully operational!"
else
  error "Failed to verify platform health"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✨ I-Vendor Platform is LIVE!                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Dashboard Overview:"
echo "$DASHBOARD" | python3 -m json.tool 2>/dev/null || echo "$DASHBOARD"
echo ""
echo "🌐 Access Points:"
echo "   • Frontend:  ${GREEN}http://localhost:5173${NC}"
echo "   • Backend:   ${GREEN}http://localhost:3000${NC}"
echo "   • Database:  ${GREEN}localhost:5432${NC} (postgres/postgres)"
echo ""
echo "🚀 Quick Start:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Browse 35+ project ideas"
echo "   3. Book alumni mentors"
echo "   4. Purchase materials from vendors"
echo "   5. Check in for attendance"
echo "   6. Earn rewards!"
echo ""
echo "📚 API Documentation:"
echo "   • GET  /api/v1/ideas          - List all project ideas"
echo "   • GET  /api/v1/mentors        - List all mentors"
echo "   • GET  /api/v1/materials      - List materials/components"
echo "   • GET  /api/v1/vendors        - List material vendors"
echo "   • POST /api/v1/attendance/checkin - Record attendance"
echo "   • POST /api/v1/cleanliness/report - Report cleanliness issues"
echo "   • POST /api/v1/rbvm/return    - Return plastic bottles"
echo ""
echo "🛑 To stop the platform:"
echo "   docker-compose down"
echo ""
echo "🔄 To restart from scratch:"
echo "   docker-compose down -v && ./launch-complete.sh"
echo ""
success "Platform is ready for use!"
