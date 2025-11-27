#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║          I-VENDER PHASE-4: COMPLETE PLATFORM LAUNCHER                       ║
# ║      Professional-grade orchestration for all services and components        ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

# ============================================================================
# COLOR DEFINITIONS & UTILITIES
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

log_step() {
    echo -e "\n${MAGENTA}▶${NC} $1"
}

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
LOG_DIR="$SCRIPT_DIR/.launcher-logs"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=2

# Service URLs
BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"
DB_URL="http://localhost:8080"
MINIO_URL="http://localhost:9001"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

create_log_dir() {
    mkdir -p "$LOG_DIR"
}

check_docker_installed() {
    log_step "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        echo "Please install Docker from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        echo "Please install Docker Compose"
        exit 1
    fi
    
    log_success "Docker and Docker Compose are installed"
}

check_docker_running() {
    log_step "Checking Docker daemon..."
    
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon is not running"
        echo "Please start Docker and try again"
        exit 1
    fi
    
    log_success "Docker daemon is running"
}

check_port_available() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        log_warning "Port $port is already in use (Service: $service)"
        return 1
    fi
    return 0
}

check_ports() {
    log_step "Checking port availability..."
    
    local ports=(4000 5173 5432 8080 9000 9001)
    local services=("Backend" "Frontend" "PostgreSQL" "Adminer" "MinIO API" "MinIO Console")
    
    for i in "${!ports[@]}"; do
        if check_port_available "${ports[$i]}" "${services[$i]}"; then
            log_success "Port ${ports[$i]} available (${services[$i]})"
        fi
    done
}

clear_logs() {
    log_step "Clearing previous logs..."
    rm -rf "$LOG_DIR"/*
    log_success "Logs cleared"
}

docker_compose_up() {
    log_step "Starting Docker Compose services..."
    
    if [ -f "$COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" up -d 2>&1 | tee "$LOG_DIR/docker-compose.log"
        log_success "Docker Compose services started"
    else
        log_error "docker-compose.yml not found at $COMPOSE_FILE"
        exit 1
    fi
}

docker_compose_down() {
    log_step "Stopping Docker Compose services..."
    docker-compose -f "$COMPOSE_FILE" down
    log_success "Docker Compose services stopped"
}

wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=$3
    local elapsed=0
    
    log_step "Waiting for $service_name to be ready..."
    
    while [ $elapsed -lt $timeout ]; do
        if curl -s -f "$url/health" &> /dev/null; then
            log_success "$service_name is ready"
            return 0
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        echo -ne "  ⏳ ${elapsed}s/${timeout}s\r"
    done
    
    log_error "$service_name failed to become ready (timeout: ${timeout}s)"
    return 1
}

wait_for_database() {
    log_step "Waiting for PostgreSQL database..."
    local elapsed=0
    local timeout=60
    
    while [ $elapsed -lt $timeout ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &> /dev/null; then
            log_success "PostgreSQL database is ready"
            return 0
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        echo -ne "  ⏳ ${elapsed}s/${timeout}s\r"
    done
    
    log_error "PostgreSQL database failed to become ready"
    return 1
}

populate_seed_data() {
    log_step "Populating seed data..."
    
    sleep 5  # Give backend time to initialize
    
    if curl -s -X POST "$BACKEND_URL/api/v1/seed/populate" | grep -q "success"; then
        log_success "Seed data populated successfully"
        return 0
    else
        log_warning "Could not verify seed data population"
        return 1
    fi
}

show_service_urls() {
    log_header "🎉 ALL SERVICES RUNNING"
    
    echo -e "${GREEN}Service URLs:${NC}"
    echo -e "  ${CYAN}Frontend:${NC}     $FRONTEND_URL"
    echo -e "  ${CYAN}Backend:${NC}      $BACKEND_URL"
    echo -e "  ${CYAN}DB Admin:${NC}     $DB_URL"
    echo -e "  ${CYAN}MinIO:${NC}        $MINIO_URL"
    
    echo -e "\n${GREEN}Default Credentials:${NC}"
    echo -e "  ${CYAN}Database:${NC}     $DB_USER / $DB_PASSWORD"
    echo -e "  ${CYAN}MinIO:${NC}        minioadmin / minioadmin"
    
    echo -e "\n${GREEN}Test Commands:${NC}"
    echo -e "  ${CYAN}Backend Health:${NC}   curl $BACKEND_URL/health"
    echo -e "  ${CYAN}Seed Status:${NC}      curl $BACKEND_URL/api/v1/seed/status"
    echo -e "  ${CYAN}Reset Data:${NC}       curl -X DELETE $BACKEND_URL/api/v1/seed/reset"
    
    echo -e "\n${GREEN}Stop Services:${NC}"
    echo -e "  ${CYAN}Command:${NC}          ./launch-complete.sh --stop\n"
}

show_status() {
    log_header "📊 SERVICE STATUS"
    
    echo -e "${BLUE}Docker Containers:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n${BLUE}Service Health:${NC}"
    
    # Check backend
    if curl -s -f "$BACKEND_URL/health" &> /dev/null; then
        log_success "Backend API is running"
    else
        log_error "Backend API is not responding"
    fi
    
    # Check database
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &> /dev/null; then
        log_success "PostgreSQL database is running"
    else
        log_error "PostgreSQL database is not responding"
    fi
    
    # Check seed data
    local seed_status=$(curl -s "$BACKEND_URL/api/v1/seed/status" 2>/dev/null)
    if echo "$seed_status" | grep -q "total_records"; then
        local total=$(echo "$seed_status" | grep -o '"total_records":[0-9]*' | cut -d: -f2)
        if [ ! -z "$total" ] && [ "$total" -gt 0 ]; then
            log_success "Seed data is populated ($total records)"
        else
            log_warning "No seed data found"
        fi
    fi
}

show_help() {
    cat << EOF
${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}
${CYAN}║            I-VENDER PHASE-4 LAUNCHER - HELP                   ║${NC}
${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}

${GREEN}USAGE:${NC}
  ./launch-complete.sh [COMMAND]

${GREEN}COMMANDS:${NC}
  ${YELLOW}(no args)${NC}           Start all services with seed data (default)
  ${YELLOW}--empty${NC}              Start services WITHOUT seed data
  ${YELLOW}--reset${NC}              Reset and repopulate all seed data
  ${YELLOW}--stop${NC}               Stop all running services
  ${YELLOW}--status${NC}             Show status of all services
  ${YELLOW}--help${NC}               Display this help message

${GREEN}EXAMPLES:${NC}
  ./launch-complete.sh                  # Full startup with seed data
  ./launch-complete.sh --empty          # Start without data
  ./launch-complete.sh --reset          # Reset database & reseed
  ./launch-complete.sh --stop           # Stop all services
  ./launch-complete.sh --status         # Check service status

${GREEN}SERVICE PORTS:${NC}
  Backend:      4000
  Frontend:     5173
  PostgreSQL:   5432
  Adminer:      8080
  MinIO API:    9000
  MinIO Console: 9001

${GREEN}CREDENTIALS:${NC}
  PostgreSQL:   postgres / postgres
  MinIO:        minioadmin / minioadmin

${GREEN}FEATURES:${NC}
  ✓ Docker validation & health checks
  ✓ Automatic sequential startup
  ✓ Database initialization
  ✓ Seed data population
  ✓ Color-coded output
  ✓ Service monitoring

${GREEN}LOGS:${NC}
  Location: .launcher-logs/

${CYAN}For more information, visit the documentation:${NC}
  README.md, LAUNCHER_GUIDE.md, QUICK_LAUNCH.md

EOF
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local command="${1:---full}"
    
    case "$command" in
        --stop)
            log_header "🛑 STOPPING I-VENDER PLATFORM"
            docker_compose_down
            log_success "All services have been stopped"
            ;;
        
        --status)
            show_status
            ;;
        
        --help)
            show_help
            ;;
        
        --empty)
            log_header "🚀 STARTING I-VENDER PLATFORM (WITHOUT SEED DATA)"
            create_log_dir
            check_docker_installed
            check_docker_running
            check_ports
            clear_logs
            docker_compose_up
            
            # Wait for services
            wait_for_database || exit 1
            wait_for_service "$BACKEND_URL" "Backend API" "$HEALTH_CHECK_TIMEOUT" || exit 1
            
            show_service_urls
            ;;
        
        --reset)
            log_header "♻️ RESETTING & REPOPULATING I-VENDER PLATFORM"
            create_log_dir
            check_docker_installed
            check_docker_running
            check_ports
            clear_logs
            docker_compose_up
            
            # Wait for services
            wait_for_database || exit 1
            wait_for_service "$BACKEND_URL" "Backend API" "$HEALTH_CHECK_TIMEOUT" || exit 1
            
            # Reset seed data
            populate_seed_data
            
            show_service_urls
            ;;
        
        --full|"")
            log_header "🚀 STARTING I-VENDER PHASE-4 PLATFORM"
            log_info "All services with test data will start automatically"
            
            create_log_dir
            check_docker_installed
            check_docker_running
            check_ports
            clear_logs
            docker_compose_up
            
            # Wait for services
            wait_for_database || exit 1
            wait_for_service "$BACKEND_URL" "Backend API" "$HEALTH_CHECK_TIMEOUT" || exit 1
            
            # Populate seed data
            populate_seed_data
            
            show_service_urls
            ;;
        
        *)
            log_error "Unknown command: $command"
            echo "Use './launch-complete.sh --help' for available commands"
            exit 1
            ;;
    esac
}

# ============================================================================
# EXECUTE
# ============================================================================

main "$@"
