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
   SERVER_HOST=0.0.0.0

   # Client configuration
   CLIENT_PORT=3000
   CLIENT_HOST=0.0.0.0
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

   # Security secrets (REQUIRED - no defaults)
   JWT_SECRET=your_jwt_access_token_secret_here_minimum_32_characters_long
   REFRESH_SECRET=your_refresh_token_secret_here_minimum_32_characters_long
   INTERNAL_SECRET=your_internal_secret_for_server_to_server_auth_minimum_32_characters_long

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
   SERVER_HOST=0.0.0.0

   # Client configuration
   CLIENT_PORT=3000
   CLIENT_HOST=0.0.0.0
   NEXT_PUBLIC_API_BASE_URL=http://server:8000

   # Security secrets (REQUIRED - no defaults)
   JWT_SECRET=your_jwt_access_token_secret_here_minimum_32_characters_long
   REFRESH_SECRET=your_refresh_token_secret_here_minimum_32_characters_long
   INTERNAL_SECRET=your_internal_secret_for_server_to_server_auth_minimum_32_characters_long

   # CORS configuration
   ALLOWED_ORIGINS=http://localhost:3000

   # Cookie security (set to false for HTTP local development)
   SECURE_COOKIES=false

   # Environment
   NODE_ENV=development
   ```

   **Important Notes:**
   - `POSTGRES_HOST=postgres` (Docker service name, not `localhost`)
   - `NEXT_PUBLIC_API_BASE_URL=http://server:8000` (Docker service name)
   - `JWT_SECRET`, `REFRESH_SECRET`, and `INTERNAL_SECRET` are REQUIRED - no defaults provided
   - `INTERNAL_SECRET` must be the **SAME value** in both server `.env` and client `.env.local` files
   - This secret is used for server-to-server authentication between Next.js API routes and the backend
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
2. PostgreSQL container starts with your database
3. Server container starts, runs migrations, and seeds the database
4. Client container starts and serves the frontend

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

**Error:** `Cannot connect to backend server`

**Solutions:**
- **npm:** Verify `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `.env`
- **Docker:** Verify `NEXT_PUBLIC_API_BASE_URL=http://server:8000` in `.env`
- Rebuild client: `docker-compose build --no-cache client`

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

## Rate Limiting & Performance

### Rate Limits (Production)

The application implements rate limiting to protect against abuse and ensure fair usage:

- **Auth Endpoints** (signup, login, refresh):
  - 5 requests per minute
  - 20 requests per hour
  - IP-based throttling

- **Transaction Endpoints**:
  - 200 requests per minute
  - 1000 requests per hour

- **Budget Endpoints**:
  - 200 requests per minute
  - 1000 requests per hour

- **Analytics Endpoints**:
  - 200 requests per minute
  - 1000 requests per hour

**Note:** Rate limiting is **disabled in development** (`NODE_ENV=development`) to allow easier testing. It is automatically enabled in production.

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

