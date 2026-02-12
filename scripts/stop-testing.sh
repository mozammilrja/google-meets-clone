#!/bin/bash

##############################################################################
# Phase 3.1 Test Environment Cleanup Script
# Stops all running services and cleans up
#
# Usage: ./stop-testing.sh [options]
# Options:
#   --remove-logs    Delete log files
#   --hard           Kill using SIGKILL instead of SIGTERM
#
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
REMOVE_LOGS=false
HARD_KILL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --remove-logs)
      REMOVE_LOGS=true
      shift
      ;;
    --hard)
      HARD_KILL=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Helper functions
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

##############################################################################
# Kill Services by Port
##############################################################################

kill_service_by_port() {
  local port=$1
  local service=$2
  
  local pid=$(lsof -ti :$port 2>/dev/null || true)
  
  if [ -z "$pid" ]; then
    log_info "$service not running on port $port"
    return 0
  fi
  
  log_info "Stopping $service (PID: $pid) on port $port..."
  
  if [ "$HARD_KILL" = true ]; then
    if kill -9 $pid 2>/dev/null; then
      log_success "Killed $service"
      return 0
    else
      log_error "Failed to kill $service"
      return 1
    fi
  else
    if kill -TERM $pid 2>/dev/null; then
      log_success "Stopped $service"
      sleep 1
      return 0
    else
      log_error "Failed to stop $service"
      return 1
    fi
  fi
}

##############################################################################
# Kill Services by Name
##############################################################################

kill_service_by_name() {
  local name=$1
  local pattern=$2
  
  local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
  
  if [ -z "$pids" ]; then
    log_info "$name not running"
    return 0
  fi
  
  log_info "Stopping $name (PIDs: $pids)..."
  
  if [ "$HARD_KILL" = true ]; then
    if pkill -9 -f "$pattern" 2>/dev/null; then
      log_success "Killed $name"
      return 0
    else
      log_error "Failed to kill $name"
      return 1
    fi
  else
    if pkill -TERM -f "$pattern" 2>/dev/null; then
      log_success "Stopped $name"
      sleep 1
      return 0
    else
      log_error "Failed to stop $name"
      return 1
    fi
  fi
}

##############################################################################
# Main Cleanup
##############################################################################

echo ""
log_info "Stopping Phase 3.1 testing services..."
echo ""

# Stop Backend (port 3000, NestJS)
kill_service_by_port 3000 "Backend" || true

# Stop Media Server (port 5000, Mediasoup)
kill_service_by_port 5000 "Media Server" || true

# Stop Frontend (port 3001, Next.js)
kill_service_by_port 3001 "Frontend" || true

# Cleanup other Node processes if they're still running
kill_service_by_name "Node processes" "node.*start:dev|node.*dev" || true

echo ""

##############################################################################
# Log Cleanup
##############################################################################

if [ "$REMOVE_LOGS" = true ]; then
  log_info "Cleaning up log files..."
  
  if [ -f "/tmp/backend.log" ]; then
    rm -f /tmp/backend.log
    log_success "Removed backend logs"
  fi
  
  if [ -f "/tmp/media.log" ]; then
    rm -f /tmp/media.log
    log_success "Removed media server logs"
  fi
  
  if [ -f "/tmp/frontend.log" ]; then
    rm -f /tmp/frontend.log
    log_success "Removed frontend logs"
  fi
  
  echo ""
fi

##############################################################################
# Summary
##############################################################################

log_success "All services stopped"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     Phase 3.1 Testing Environment Shutdown Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Remaining services:"
if lsof -ti :3000 >/dev/null 2>&1; then
  log_warning "Port 3000 still in use"
else
  log_success "Port 3000 is free"
fi

if lsof -ti :5000 >/dev/null 2>&1; then
  log_warning "Port 5000 still in use"
else
  log_success "Port 5000 is free"
fi

if lsof -ti :3001 >/dev/null 2>&1; then
  log_warning "Port 3001 still in use"
else
  log_success "Port 3001 is free"
fi

echo ""
log_info "To restart services, run: ./start-testing.sh"
echo ""
