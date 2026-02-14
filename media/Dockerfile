# Media Server Dockerfile - Production
# Requires special build for mediasoup native dependencies

FROM node:20-bullseye AS builder

WORKDIR /app

# Install build dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-bullseye-slim AS production

WORKDIR /app

# Install runtime dependencies for mediasoup
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies (rebuild native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && npm ci --only=production \
    && apt-get purge -y build-essential \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist

# Create recordings directory
RUN mkdir -p /tmp/recordings

# Create non-root user
RUN groupadd -r mediasoup && useradd -r -g mediasoup mediasoup
RUN chown -R mediasoup:mediasoup /app /tmp/recordings

USER mediasoup

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7000/health/live || exit 1

# Expose HTTP port and RTC ports
EXPOSE 7000
EXPOSE 40000-49999/udp
EXPOSE 40000-49999/tcp

CMD ["node", "dist/main.js"]
