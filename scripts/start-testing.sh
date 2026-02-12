#!/bin/bash

##############################################################################
# Phase 3.1 E2E Test Startup Script
# Starts all required services for end-to-end testing
# 
# Usage: ./start-testing.sh [options]
# Options:
#   --skip-checks    Skip prerequisite checks
#   --clean          Remove node_modules and reinstall
#   --verbose        Show all output
#
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
MEDIA_DIR="$PROJECT_ROOT/media"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Options
SKIP_CHECKS=false
CLEAN=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-checks)
      SKIP_CHECKS=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

##############################################################################
# Helper Functions
##############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
  echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
  echo -e "${RED}✗${NC}  $1"
}

check_command() {
  if command -v "$1" &> /dev/null; then
    log_success "$1 found"
    return 0
  else
    log_error "$1 not found"
    return 1
  fi
}

check_port() {
  local port=$1
  if nc -z localhost "$port" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

wait_for_service() {
  local port=$1
  local service=$2
  local max_attempts=30
  local attempt=0

  log_info "Waiting for $service on port $port..."
  
  while ! check_port "$port"; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      log_error "$service failed to start after 30 seconds"
      return 1
    fi
    echo -ne "${BLUE}.${NC}"
    sleep 1
  done
  
  echo ""
  log_success "$service is running on port $port"
  return 0
}

##############################################################################
# Prerequisites Check
##############################################################################

if [ "$SKIP_CHECKS" = false ]; then
  echo ""
  log_info "Checking prerequisites..."
  
  local all_good=true
  
  if ! check_command "node"; then
    all_good=false
  fi
  
  if ! check_command "npm"; then
    all_good=false
  fi
  
  if ! check_command "mongod"; then
    log_warning "MongoDB not found - ensure it's running separately"
  fi
  
  if ! check_command "redis-server"; then
    log_warning "Redis not found - ensure it's running separately"
  fi
  
  if ! check_command "nc"; then
    log_warning "netcat not found - port checks will be disabled"
  fi
  
  if [ "$all_good" = false ]; then
    log_error "Please install missing prerequisites"
    exit 1
  fi
  
  echo ""
fi

##############################################################################
# Directory Check
##############################################################################

log_info "Verifying project structure..."

for dir in "$BACKEND_DIR" "$MEDIA_DIR" "$FRONTEND_DIR"; do
  if [ ! -d "$dir" ]; then
    log_error "Directory not found: $dir"
    exit 1
  fi
  log_success "Found $(basename "$dir")"
done

echo ""

##############################################################################
# Cleanup (if requested)
##############################################################################

if [ "$CLEAN" = true ]; then
  log_warning "Cleaning node_modules..."
  
  for dir in "$BACKEND_DIR" "$MEDIA_DIR" "$FRONTEND_DIR"; do
    if [ -d "$dir/node_modules" ]; then
      log_info "Removing $(basename "$dir")/node_modules..."
      rm -rf "$dir/node_modules"
    fi
  done
  
  echo ""
fi

##############################################################################
# Install Dependencies
##############################################################################

log_info "Installing dependencies..."

for dir in "$BACKEND_DIR" "$MEDIA_DIR" "$FRONTEND_DIR"; do
  dirname=$(basename "$dir")
  
  if [ -f "$dir/package.json" ]; then
    if [ ! -d "$dir/node_modules" ]; then
      log_info "Installing $dirname dependencies..."
      cd "$dir"
      if [ "$VERBOSE" = true ]; then
        npm install
      else
        npm install > /dev/null 2>&1
      fi
      log_success "$dirname dependencies installed"
    else
      log_success "$dirname dependencies already installed"
    fi
  fi
done

echo ""

##############################################################################
# Service Startup
##############################################################################

log_info "Starting services..."
echo ""

# Start Backend
log_info "Starting Backend (NestJS) on port 3000..."
cd "$BACKEND_DIR"
if [ "$VERBOSE" = true ]; then
  npm run start:dev &
else
  npm run start:dev > /tmp/backend.log 2>&1 &
fi
BACKEND_PID=$!
log_success "Backend starting (PID: $BACKEND_PID)"

# Start Media Server
log_info "Starting Media Server (Mediasoup) on port 5000..."
cd "$MEDIA_DIR"
if [ "$VERBOSE" = true ]; then
  npm run dev &
else
  npm run dev > /tmp/media.log 2>&1 &
fi
MEDIA_PID=$!
log_success "Media Server starting (PID: $MEDIA_PID)"

# Start Frontend
log_info "Starting Frontend (Next.js) on port 3001..."
cd "$FRONTEND_DIR"
if [ "$VERBOSE" = true ]; then
  npm run dev &
else
  npm run dev > /tmp/frontend.log 2>&1 &
fi
FRONTEND_PID=$!
log_success "Frontend starting (PID: $FRONTEND_PID)"

echo ""

##############################################################################
# Health Checks
##############################################################################

log_info "Waiting for services to be ready..."
echo ""

# Check Backend
if wait_for_service 3000 "Backend"; then
  log_success "Backend is ready"
else
  log_error "Backend failed to start"
  if [ "$VERBOSE" = false ]; then
    echo ""
    log_info "Backend logs (tail):"
    tail -n 20 /tmp/backend.log
  fi
fi

# Check Media Server
if wait_for_service 5000 "Media Server"; then
  log_success "Media Server is ready"
else
  log_error "Media Server failed to start"
  if [ "$VERBOSE" = false ]; then
    echo ""
    log_info "Media Server logs (tail):"
    tail -n 20 /tmp/media.log
  fi
fi

# Frontend takes longer
sleep 3

echo ""
log_success "All services started successfully!"
echo ""

##############################################################################
# Startup Summary
##############################################################################

cat << EOF

${BLUE}═══════════════════════════════════════════════════════════════${NC}
${GREEN}     Phase 3.1 E2E Testing Environment Ready${NC}
${BLUE}═══════════════════════════════════════════════════════════════${NC}

${GREEN}Services Running:${NC}
  • Backend (NestJS)      → http://localhost:3000
  • Media Server (SFU)    → http://localhost:5000
  • Frontend (Next.js)    → http://localhost:3001

${GREEN}Service PIDs:${NC}
  • Backend:      $BACKEND_PID
  • Media Server: $MEDIA_PID
  • Frontend:     $FRONTEND_PID

${GREEN}Test Access:${NC}
  1. Open http://localhost:3001 in your browser
  2. Signup with: user1@test.com / Test123!
  3. Create or join a meeting
  4. Open additional browser tabs for more participants
  5. See PHASE_3_1_TESTING_GUIDE.md for detailed test steps

${GREEN}View Logs:${NC}
  Backend:       tail -f /tmp/backend.log
  Media Server:  tail -f /tmp/media.log
  Frontend:      tail -f /tmp/frontend.log

${GREEN}Stop Services:${NC}
  kill $BACKEND_PID $MEDIA_PID $FRONTEND_PID
  Or: ${YELLOW}./stop-testing.sh${NC}

${BLUE}═══════════════════════════════════════════════════════════════${NC}

EOF

##############################################################################
# Keep Script Running
##############################################################################

trap cleanup EXIT

cleanup() {
  echo ""
  log_info "Shutting down services..."
  kill $BACKEND_PID $MEDIA_PID $FRONTEND_PID 2>/dev/null || true
  log_success "All services stopped"
}

# Wait for interrupt
wait $BACKEND_PID $MEDIA_PID $FRONTEND_PID
