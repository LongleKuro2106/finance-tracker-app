# Multi-stage build for NestJS server
# Use Node.js 24.11.0 Alpine (smaller, more secure, fewer vulnerabilities)
FROM node:24.11.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install build dependencies for native modules (bcrypt)
# Update packages and clean cache to reduce vulnerabilities
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache libc6-compat openssl python3 make g++ && \
    rm -rf /var/cache/apk/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Generate Prisma Client
FROM deps AS prisma
WORKDIR /app
COPY prisma ./prisma
RUN npx prisma generate

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# Build NestJS application
RUN npm run build

# Production image - install only production dependencies
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security (best practice #3)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    apk update && apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Copy package files for production dependency installation
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./package-lock.json

# Install only production dependencies (excludes devDependencies)
# --ignore-scripts prevents postinstall scripts that might require dev dependencies
# Clean npm cache to reduce image size (best practice #10)
RUN npm ci --omit=dev --ignore-scripts --prefer-offline --no-audit && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy native modules (bcrypt) from deps stage where they were built
# bcrypt requires native bindings that are platform-specific
COPY --from=deps /app/node_modules/bcrypt ./node_modules/bcrypt

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy Prisma generated client (from prisma stage)
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma

# Copy entrypoint script and make executable
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set correct permissions
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3010

# Signal handling: Use SIGTERM for graceful shutdown
STOPSIGNAL SIGTERM

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]

