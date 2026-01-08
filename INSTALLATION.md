# Installation Guide

Step-by-step guide to install and run the Finance Tracker application using npm (local development) or Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Method 1: Local Development with npm](#method-1-local-development-with-npm)
- [Method 2: Docker (Recommended)](#method-2-docker-recommended)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### For npm Installation
- **Node.js** 24.11.0 or higher
- **PostgreSQL** 16 or higher (running locally or remotely)
- **npm** or **yarn** package manager

### For Docker Installation
- **Docker** Desktop or Docker Engine
- **Docker Compose** (usually included with Docker Desktop)

## Method 1: Local Development with npm

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd finance-tracker-app
```

### Step 2: Install Dependencies

Install dependencies for both server and client:

```bash
# Install all dependencies (workspaces handle both apps)
npm install
```

### Step 3: Set Up Environment Variables

1. **Copy the environment template:**
   ```bash
   cd ..
   cp .env.sample .env
   ```

2. **Edit `.env` file** with your configuration:
   ```bash
   # Database configuration
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_strong_password_here
   POSTGRES_DB=finance_tracker
   POSTGRES_PORT=5432
   POSTGRES_HOST=localhost

   # Server configuration
   SERVER_PORT=8000
   # Note: HOST defaults to 0.0.0.0 in main.ts (correct for Docker)
   # Only set SERVER_HOST if you need to override (not recommended)

   # Client configuration
   CLIENT_PORT=3000
   # Note: HOSTNAME defaults to 0.0.0.0 in Dockerfile (correct for Docker)
   # Only set CLIENT_HOST if you need to override (not recommended)
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

   # Security secrets (REQUIRED - no defaults)
   JWT_SECRET=your_jwt_access_token_secret_here_minimum_32_characters_long
   REFRESH_SECRET=your_refresh_token_secret_here_minimum_32_characters_long
   INTERNAL_SECRET=your_internal_secret_for_server_to_server_auth_minimum_32_characters_long

   # Optional: Bcrypt password hashing rounds (defaults: 12 for production, 10 for development)
   # Higher values = more secure but slower (recommended: 12-14 for production)
   # BCRYPT_ROUNDS=12

   # Optional: Rate limiting control (defaults: enabled in production, disabled in development)
   # Set to 'false' to disable rate limiting (NOT recommended for production)
   # ENABLE_RATE_LIMITING=true

   # CORS configuration
   ALLOWED_ORIGINS=http://localhost:3000

   # Cookie security (set to false for HTTP local development)
   SECURE_COOKIES=false

   # Environment
   NODE_ENV=development
   ```

3. **Generate secrets** (if needed):
   ```bash
   # Generate JWT access token secret (32+ characters)
   openssl rand -base64 32

   # Generate refresh token secret (32+ characters)
   openssl rand -base64 32

   # Generate database password
   openssl rand -base64 16
   ```

### Step 4: Set Up Database

1. **Ensure PostgreSQL is running:**
   ```bash
   # Check PostgreSQL status (varies by OS)
   # Windows: Check Services
   # Linux: sudo systemctl status postgresql
   # Mac: brew services list
   ```

2. **Create database** (if not exists):
   ```bash
   # Connect to PostgreSQL
   psql -U postgres

   # Create database
   CREATE DATABASE finance_tracker;

   # Exit psql
   \q
   ```

3. **Run migrations:**
   ```bash
   cd apps/server
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Seed the database:**
   ```bash
   cd apps/server
   npx prisma db seed
   ```

   This will create default categories (Groceries, Restaurants, Salary, etc.).

### Step 5: Configure Development Environment Variables

**⚠️ IMPORTANT:** Before starting the development servers, you must configure environment variables for both client and server.

#### Server `.env` File

Create a `.env` file in the `apps/server/` directory with the following required variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/finance_tracker

# JWT Secrets (REQUIRED - separate secrets for security)
JWT_SECRET=your_jwt_secret_here_minimum_32_characters_long
REFRESH_SECRET=your_refresh_secret_here_minimum_32_characters_long
INTERNAL_SECRET=your_internal_secret_for_server_to_server_auth_minimum_32_characters_long

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# Test User Password (optional, for testing)
TEST_USER_PASSWORD=your_test_password

# Environment
NODE_ENV=development
```

**Generate secrets:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate refresh secret
openssl rand -base64 32

# Generate internal secret for server-to-server authentication
openssl rand -base64 32
```

#### Client `.env.local` File

Create a `.env.local` file in the `apps/client/` directory with the following required variables:

```bash
# API Base URL (points to backend server)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Internal Secret for server-to-server authentication (REQUIRED - must match server INTERNAL_SECRET)
# This is used by Next.js API routes to authenticate with the backend
INTERNAL_SECRET=your_internal_secret_for_server_to_server_auth_minimum_32_characters_long

# Cookie Security (set to false for HTTP local development)
SECURE_COOKIES=false
```

**Important Notes:**
- `INTERNAL_SECRET` must match the `INTERNAL_SECRET` value in the server `.env` file
- This secret is used by Next.js API routes (server-side) to authenticate requests to the backend
- The `NEXT_PUBLIC_` prefix is NOT used for `INTERNAL_SECRET` (it stays server-side only)
- Next.js automatically loads `.env.local` files

### Step 6: Start Development Servers

You need **two terminal windows**:

**Single Terminal - All Apps (Turborepo):**
```bash
# From root directory
npm run dev
```

This will start both:
- Backend server on `http://localhost:8000`
- Frontend client on `http://localhost:3000`

**Alternative - Individual Apps:**
```bash
# Backend only
cd apps/server
npm run dev

# Frontend only
cd apps/client
npm run dev
```

### Step 7: Access the Application

- **Frontend:** Open http://localhost:3000 in your browser
- **Backend API:** http://localhost:8000
- **Health Check:** http://localhost:8000/health

You should see the login page. Create an account to get started!

---

## Method 2: Docker (Recommended)

Docker is the easiest way to run the application as it handles all dependencies and setup automatically.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd finance-tracker-app
```

### Step 2: Set Up Environment Variables

1. **Copy the environment template:**
   ```bash
   cp .env.sample .env
   ```

2. **Edit `.env` file** with your configuration:
   ```bash
   # Database configuration
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_strong_password_here
   POSTGRES_DB=finance_tracker
   POSTGRES_PORT=5432
   POSTGRES_HOST=postgres

   # Server configuration
   SERVER_PORT=8000
   # Note: HOST defaults to 0.0.0.0 in main.ts (correct for Docker)
   # SERVER_HOST is not needed - removed from docker-compose.yml

   # Client configuration
   CLIENT_PORT=3000
   # Note: HOSTNAME defaults to 0.0.0.0 in Dockerfile (correct for Docker)
   # CLIENT_HOST is not needed - removed from docker-compose.yml

   # API Base URL Configuration
   # IMPORTANT: Set this to the HOST-ACCESSIBLE URL (not Docker service name)
   # This is used for client-side code and CSP headers (baked into bundle at build time)
   # Examples:
   #   - Local access: http://localhost:8000
   #   - Network access: http://192.168.1.100:8000
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

   # Note: API_BASE_URL is automatically set to http://server:8000 in docker-compose.yml
   # This is used server-side (Next.js API routes) for Docker internal networking
   # You don't need to set this manually

   # Security secrets (REQUIRED - no defaults)
   JWT_SECRET=your_jwt_access_token_secret_here_minimum_32_characters_long
   REFRESH_SECRET=your_refresh_token_secret_here_minimum_32_characters_long
   INTERNAL_SECRET=your_internal_secret_for_server_to_server_auth_minimum_32_characters_long

   # CORS configuration
   # Set this to match the URL you use to access the frontend
   # Examples:
   #   - Local access: http://localhost:3000
   #   - Network access: http://192.168.1.100:3000
   #   - Multiple origins: http://localhost:3000,http://127.0.0.1:3000
   ALLOWED_ORIGINS=http://localhost:3000

   # Cookie security (set to false for HTTP local development)
   SECURE_COOKIES=false

   # Environment
   NODE_ENV=development
   ```

   **Important Notes:**
   - `POSTGRES_HOST=postgres` (Docker service name, not `localhost`)
   - `NEXT_PUBLIC_API_BASE_URL` should be set to the **host-accessible URL** (e.g., `http://localhost:8000`), NOT the Docker service name
     - This is baked into the client bundle at build time
     - Used for CSP headers and any client-side code
   - `API_BASE_URL` is automatically set to `http://server:8000` in docker-compose.yml for server-side communication
     - Used by Next.js API routes (server-side) to communicate with backend via Docker internal networking
     - You don't need to set this manually
   - `ALLOWED_ORIGINS` must match the URL you use to access the frontend (e.g., `http://localhost:3000`)
   - `JWT_SECRET`, `REFRESH_SECRET`, and `INTERNAL_SECRET` are REQUIRED - no defaults provided
   - `INTERNAL_SECRET` must be the **SAME value** in both server `.env` and client `.env.local` files (for npm installation)
   - Generate strong passwords and secrets (minimum 32 characters recommended)

3. **Generate secrets** (if needed):
   ```bash
   # Generate JWT access token secret (32+ characters)
   openssl rand -base64 32

   # Generate refresh token secret (32+ characters)
   openssl rand -base64 32

   # Generate internal secret for server-to-server authentication (32+ characters)
   # IMPORTANT: Use the SAME value for both server and client .env files
   openssl rand -base64 32

   # Generate database password
   openssl rand -base64 16
   ```

### Step 3: Build and Start Services

```bash
# Build and start all services
docker-compose up --build -d

# View logs (optional)
docker-compose logs -f
```

**What happens:**
1. Docker builds images for server and client
   - Client build bakes `NEXT_PUBLIC_API_BASE_URL` into the bundle (from `.env` or build arg)
   - Server build prepares NestJS application
2. PostgreSQL container starts with your database
3. Server container starts, runs migrations, and seeds the database
4. Client container starts and serves the frontend
   - Server-side API routes use `API_BASE_URL=http://server:8000` (Docker internal networking)
   - Client-side code uses `NEXT_PUBLIC_API_BASE_URL` (host-accessible URL)

**Important:** If you change `NEXT_PUBLIC_API_BASE_URL` in `.env`, you must rebuild the client:
```bash
docker-compose build --no-cache client
docker-compose up -d client
```

**Expected output:**
```
✅ postgres    - Database running
✅ server      - API running on port 8000
✅ client      - Frontend running on port 3000
```

### Step 4: Access the Application

- **Frontend:** Open http://localhost:3000 in your browser
- **Backend API:** http://localhost:8000
- **Health Check:** http://localhost:8000/health

### Understanding Docker Networking

The application uses two different API URLs depending on where the request originates:

1. **Server-side requests** (Next.js API routes running in the client container):
   - Use `API_BASE_URL=http://server:8000` (Docker service name)
   - This is automatically set in docker-compose.yml
   - Works via Docker's internal DNS networking
   - No CORS needed (server-to-server communication)

2. **Client-side requests** (browser JavaScript):
   - Use `NEXT_PUBLIC_API_BASE_URL` (host-accessible URL)
   - Must be set to a URL accessible from your browser (e.g., `http://localhost:8000`)
   - Baked into the bundle at build time
   - Requires CORS configuration on backend

**Configuration Summary:**
- `NEXT_PUBLIC_API_BASE_URL`: Host-accessible URL (e.g., `http://localhost:8000`)
- `API_BASE_URL`: Automatically set to `http://server:8000` (Docker internal)
- `ALLOWED_ORIGINS`: Must match frontend URL (e.g., `http://localhost:3000`)

**If you change `NEXT_PUBLIC_API_BASE_URL`:**
You must rebuild the client container because it's baked into the bundle:
```bash
docker-compose build --no-cache client
docker-compose up -d client
```

### Step 5: Useful Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f postgres

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose up --build -d
```

---

## Verification

### Check Server Health

```bash
# Using curl
curl http://localhost:8000/health

# Expected response:
# {"status":"ok"}
```

### Check Database Connection

**For npm installation:**
```bash
cd apps/server
npx prisma studio
# Opens Prisma Studio at http://localhost:5555
```

**For Docker installation:**
```bash
docker-compose exec server npx prisma studio
# Opens Prisma Studio at http://localhost:5555
```

### Test Authentication

1. Open http://localhost:3000
2. Click "Sign Up" or "Login"
3. Create a new account or login
4. You should be redirected to the dashboard

---

## Troubleshooting

### Docker-Specific Issues

#### CORS Errors in Docker

**Error:** `CORS Error` or `500 Internal Server Error` when accessing frontend

**Solutions:**
1. Verify `ALLOWED_ORIGINS` matches the exact URL you use to access the frontend:
   ```bash
   # If accessing via http://localhost:3000
   ALLOWED_ORIGINS=http://localhost:3000

   # If accessing via http://127.0.0.1:3000
   ALLOWED_ORIGINS=http://127.0.0.1:3000

   # Multiple origins (comma-separated, no spaces)
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

2. Verify `NEXT_PUBLIC_API_BASE_URL` is set to host-accessible URL:
   ```bash
   # Correct (host-accessible)
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

   # Incorrect (Docker service name - won't work from browser)
   # NEXT_PUBLIC_API_BASE_URL=http://server:8000
   ```

3. Rebuild client after changing `NEXT_PUBLIC_API_BASE_URL`:
   ```bash
   docker-compose build --no-cache client
   docker-compose up -d client
   ```

4. Check server logs for CORS errors:
   ```bash
   docker-compose logs server | grep -i cors
   ```

#### Services Binding to Wrong Address

**Issue:** Services binding to `0.0.0.0:3000` or `0.0.0.0:8000` instead of expected address

**Solution:** This is **correct behavior** for Docker. Services should bind to `0.0.0.0` inside containers:
- `0.0.0.0` means "listen on all network interfaces"
- Docker port mapping (`"${CLIENT_PORT}:3000"`) handles exposing to host
- Do NOT set `CLIENT_HOST` or `SERVER_HOST` - they're not needed and can cause issues
- The defaults in code (main.ts and Dockerfile) are correct

### Common Issues

#### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port (Windows)
netstat -ano | findstr :3000

# Find process using port (Linux/Mac)
lsof -i :3000

# Kill the process or change port in .env
```

#### Database Connection Failed

**Error:** `Can't reach database server`

**Solutions:**
- **npm:** Ensure PostgreSQL is running and credentials in `.env` are correct
- **Docker:** Check if postgres container is running: `docker-compose ps`
- Verify `POSTGRES_HOST` in `.env`:
  - npm: `localhost`
  - Docker: `postgres` (service name)

#### Frontend Can't Connect to Backend

**Error:** `Cannot connect to backend server` or `500 Internal Server Error` on login

**Solutions:**
- **npm:** Verify `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `.env.local`
- **Docker:**
  - Verify `NEXT_PUBLIC_API_BASE_URL` is set to **host-accessible URL** (e.g., `http://localhost:8000`), NOT `http://server:8000`
  - Verify `ALLOWED_ORIGINS` matches the URL you use to access the frontend (e.g., `http://localhost:3000`)
  - Rebuild client after changing `NEXT_PUBLIC_API_BASE_URL`: `docker-compose build --no-cache client`
  - Check server logs: `docker-compose logs server` (look for CORS errors)
  - Check client logs: `docker-compose logs client` (look for API connection errors)

#### Migration Errors

**Error:** `Migration failed`

**Solutions:**
```bash
# Reset database (⚠️ deletes all data)
cd apps/server
npx prisma migrate reset

# Or manually reset
npx prisma migrate dev --name reset
```

#### Docker Build Fails

**Error:** `Build failed`

**Solutions:**
```bash
# Clean build
docker-compose down
docker-compose build --no-cache

# Check logs
docker-compose build 2>&1 | tee build.log
```

### Getting Help

- Check logs: `docker-compose logs -f` or check terminal output
- Verify environment variables match your setup
- Ensure all prerequisites are installed
- Review the troubleshooting section above for common issues

---

## Security Configuration

### Rate Limiting

The application implements rate limiting to protect against abuse and ensure fair usage:

- **Auth Endpoints** (signup, login, refresh, password update):
  - Production: 5 requests per minute
  - Development: 20 requests per minute (if enabled)

- **Transaction Endpoints**:
  - Production: 200 requests/minute, 1000 requests/hour
  - Development: 500 requests/minute, 2000 requests/hour (if enabled)

- **Budget Endpoints**:
  - Production: 50 requests/minute, 200 requests/hour
  - Development: 100 requests/minute, 500 requests/hour (if enabled)

- **Analytics Endpoints**:
  - Production: 30 requests/minute, 1000 requests/hour
  - Development: 60 requests/minute, 2000 requests/hour (if enabled)

**Rate Limiting Behavior:**
- **Production:** Enabled by default (unless `ENABLE_RATE_LIMITING=false`)
- **Development:** Disabled by default (enable with `ENABLE_RATE_LIMITING=true`)
- Rate limiting uses user-based tracking for authenticated requests (per-user limits)
- Falls back to IP-based tracking for unauthenticated requests

### Password Security

- **Password Complexity Requirements:**
  - Minimum 12 characters (signup) or 8 characters (update)
  - Must contain: uppercase letter, lowercase letter, number, and special character
  - Maximum 72 characters (bcrypt limit)

- **Password Hashing:**
  - Uses bcrypt with configurable cost factor
  - Production default: 12 rounds (~300-500ms per hash)
  - Development default: 10 rounds (~100ms per hash)
  - Can be configured via `BCRYPT_ROUNDS` environment variable (4-31 range)

### Cookie Security

- **SameSite Policy:** `strict` (stronger CSRF protection)
- **HttpOnly:** Enabled (prevents JavaScript access)
- **Secure Flag:** Enabled in production (HTTPS only)
- **Path:** `/` (applies to entire site)

## Rate Limiting & Performance

### Rate Limits (Production)

See [Security Configuration](#security-configuration) section above for detailed rate limits.

**Note:** Rate limiting defaults to **enabled in production** and **disabled in development** for easier testing. You can override this behavior with the `ENABLE_RATE_LIMITING` environment variable.

### Performance Optimizations

The application includes several performance optimizations:

- **Request Deduplication**: Prevents duplicate concurrent API requests
- **API Response Caching**: 30-second cache for GET requests (60s for analytics)
- **Request Debouncing**: 500ms debounce on data fetching hooks to prevent rapid successive calls
- **Component Memoization**: React.memo, useMemo, useCallback for optimized renders
- **Lazy Loading**: Chart components loaded on-demand (code splitting)
- **Build Optimizations**: SWC minification, React strict mode, image optimization (AVIF/WebP)

These optimizations reduce server load, improve response times, and provide a better user experience.

## Next Steps

After successful installation:

1. **Create an account** at http://localhost:3000
2. **Add transactions** to track your income and expenses
3. **Set budgets** for monthly planning
4. **View analytics** to understand your spending patterns

For more information:
- **[README.md](./README.md)** - Application overview and features

