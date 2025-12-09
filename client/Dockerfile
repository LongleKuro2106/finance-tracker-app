# Multi-stage build for Next.js client
# Use Node.js 24.11.0 Alpine (smaller, more secure, fewer vulnerabilities)
FROM node:24.11.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Update packages and clean cache to reduce vulnerabilities
RUN apk update && apk upgrade --no-cache && \
  apk add --no-cache libc6-compat && \
  rm -rf /var/cache/apk/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Install all dependencies (including dev) for build stage
RUN npm ci --prefer-offline --no-audit

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build argument for API base URL
# Defaults to http://server:3010 for Docker, but can be overridden
ARG NEXT_PUBLIC_API_BASE_URL=http://server:3010

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security (best practice #3)
# Update packages and clean cache to reduce vulnerabilities
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs && \
  apk update && apk upgrade --no-cache && \
  rm -rf /var/cache/apk/*

# Copy necessary files from standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Signal handling: Use SIGTERM for graceful shutdown
STOPSIGNAL SIGTERM

# Port and hostname are set via environment variables from docker-compose
# These will be provided at runtime, not at build time
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

