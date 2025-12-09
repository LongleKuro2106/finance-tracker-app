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
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
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
   SERVER_PORT=3010
   SERVER_HOST=0.0.0.0

   # Client configuration
   CLIENT_PORT=3000
   CLIENT_HOST=0.0.0.0
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3010

   # Security secrets
   JWT_SECRET=your_jwt_secret_here_minimum_32_characters_long

   # CORS configuration
   ALLOWED_ORIGINS=http://localhost:3000

   # Cookie security (set to false for HTTP local development)
   SECURE_COOKIES=false

   # Environment
   NODE_ENV=development
   ```

3. **Generate secrets** (if needed):
   ```bash
   # Generate JWT secret (32+ characters)
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
   cd server
   npx prisma migrate dev
   ```

4. **Seed the database:**
   ```bash
   npx prisma db seed
   ```

   This will create default categories (Groceries, Restaurants, Salary, etc.).

### Step 5: Start Development Servers

You need **two terminal windows**:

**Terminal 1 - Backend Server:**
```bash
cd server
npm run start:dev
```

The server should start on `http://localhost:3010`

**Terminal 2 - Frontend Client:**
```bash
cd client
npm run dev
```

The client should start on `http://localhost:3000`

### Step 6: Access the Application

- **Frontend:** Open http://localhost:3000 in your browser
- **Backend API:** http://localhost:3010
- **Health Check:** http://localhost:3010/health

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
   SERVER_PORT=3010
   SERVER_HOST=0.0.0.0

   # Client configuration
   CLIENT_PORT=3000
   CLIENT_HOST=0.0.0.0
   NEXT_PUBLIC_API_BASE_URL=http://server:3010

   # Security secrets
   JWT_SECRET=your_jwt_secret_here_minimum_32_characters_long

   # CORS configuration
   ALLOWED_ORIGINS=http://localhost:3000

   # Cookie security (set to false for HTTP local development)
   SECURE_COOKIES=false

   # Environment
   NODE_ENV=development
   ```

   **Important Notes:**
   - `POSTGRES_HOST=postgres` (Docker service name, not `localhost`)
   - `NEXT_PUBLIC_API_BASE_URL=http://server:3010` (Docker service name)
   - Generate strong passwords and secrets

3. **Generate secrets** (if needed):
   ```bash
   # Generate JWT secret (32+ characters)
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
✅ server      - API running on port 3010
✅ client      - Frontend running on port 3000
```

### Step 4: Access the Application

- **Frontend:** Open http://localhost:3000 in your browser
- **Backend API:** http://localhost:3010
- **Health Check:** http://localhost:3010/health

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
curl http://localhost:3010/health

# Expected response:
# {"status":"ok"}
```

### Check Database Connection

**For npm installation:**
```bash
cd server
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
- **npm:** Verify `NEXT_PUBLIC_API_BASE_URL=http://localhost:3010` in `.env`
- **Docker:** Verify `NEXT_PUBLIC_API_BASE_URL=http://server:3010` in `.env`
- Rebuild client: `docker-compose build --no-cache client`

#### Migration Errors

**Error:** `Migration failed`

**Solutions:**
```bash
# Reset database (⚠️ deletes all data)
cd server
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

## Next Steps

After successful installation:

1. **Create an account** at http://localhost:3000
2. **Add transactions** to track your income and expenses
3. **Set budgets** for monthly planning
4. **View analytics** to understand your spending patterns

For more information:
- **[README.md](./README.md)** - Application overview and features

