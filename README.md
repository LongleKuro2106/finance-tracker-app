# Finance Tracker

A personal finance tracking application created as a learning project to explore Next.js, NestJS, system architecture, security measures, validation, and deployment practices.

## 📋 Overview

Finance Tracker is a full-stack web application that helps users manage their personal finances by tracking income and expenses, setting monthly budgets, and analyzing spending patterns through comprehensive analytics.

## 🎯 Key Features

### User Capabilities

- **Authentication & Security**
  - Secure user registration and login
  - JWT-based authentication with refresh token rotation
  - Account lockout after failed login attempts
  - HttpOnly cookies for token storage
  - Profile management (update email/password, delete account)

- **Transaction Management**
  - Add income and expense transactions
  - Categorize transactions (e.g., Groceries, Restaurants, Salary)
  - Edit and delete existing transactions
  - View transaction history with pagination
  - Filter transactions by date and category

- **Budget Management**
  - Set monthly budgets for income and expenses
  - Track budget usage and remaining amounts
  - Preserve unused budget amounts to next month
  - View budget status and alerts

- **Analytics & Insights**
  - Overview dashboard with total revenue, expenses, and net balance
  - Monthly spending trends and patterns
  - Category-wise expense breakdown
  - Income vs expenses comparison
  - Cumulative savings tracking

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend:** NestJS, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Authentication:** JWT with refresh tokens
- **Security:** Helmet, CORS, Rate Limiting, Input Validation

## 🪝 Custom Hooks

The application includes several reusable custom hooks for common patterns, located in `client/hooks/`:

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useApi` | Generic API fetching | Caching, auto-refetch, abort control |
| `useDebounce` | Delay value updates | Reduces API calls, better UX |
| `useDialog` | Dialog state | Simple open/close management |
| `useLocalStorage` | Persistent storage | Cross-tab sync, React state |
| `useTransactions` | Transaction data | Pagination, CRUD operations |
| `useBudgets` | Budget data | CRUD operations, preserve logic |

### Hook Details

**`useApi`** - Generic data fetching hook with built-in caching (30s default), automatic refetching, and request cancellation. Prevents duplicate API calls and reduces rate limiting.

**`useDebounce`** - Delays value updates until user stops typing/changing. Perfect for search inputs to reduce unnecessary API calls.

**`useDialog`** - Manages dialog/modal open/close state with simple `open()`, `close()`, and `toggle()` functions.

**`useLocalStorage`** - Synchronizes React state with browser localStorage. Automatically syncs across browser tabs. ⚠️ **Note:** Not used for sensitive data like tokens.

**`useTransactions`** - Handles transaction data fetching with cursor-based pagination, infinite scroll support, and delete operations.

**`useBudgets`** - Manages budget data with full CRUD operations including preserve functionality for copying budgets to next month.

All hooks provide TypeScript type safety and are optimized for performance.

## 🚀 API Routes

### Authentication (`/auth`)
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/me` - Get current user info
- `PATCH /auth/me` - Update user profile (email, password)
- `DELETE /auth/me` - Delete user account (requires password confirmation)

### Transactions (`/transactions`)
- `GET /transactions` - List user transactions (with pagination)
- `POST /transactions` - Create new transaction
- `POST /transactions/search` - Search transactions
- `PATCH /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

### Budgets (`/budgets`)
- `GET /budgets` - List all user budgets
- `POST /budgets` - Create monthly budget
- `GET /budgets/:month/:year` - Get specific month's budget
- `PATCH /budgets/:month/:year` - Update budget
- `DELETE /budgets/:month/:year` - Delete budget
- `GET /budgets/status` - Get budget status for month/year
- `POST /budgets/:month/:year/preserve` - Preserve budget to next month
- `PATCH /budgets/:month/:year/toggle-preserve` - Toggle preserve setting

### Analytics (`/analytics`)
- `GET /analytics/overview` - Get financial overview (revenue, expenses, balance)
- `GET /analytics/monthly` - Get monthly trends (income vs expenses)
- `GET /analytics/daily` - Get daily spending for current month (expenses by day)
- `GET /analytics/categories` - Get category-wise breakdown

### Health Check
- `GET /health` - Service health check

## 🔒 Security Features

- JWT authentication with token rotation
- HttpOnly cookies for secure token storage
- Rate limiting on all endpoints (disabled in development)
- Input validation and sanitization
- HTML/Script sanitization (DOMPurify) for user input
- SQL injection prevention via Prisma ORM
- UUID-based transaction IDs (prevents enumeration)
- Account lockout after failed attempts (5 attempts → 15min lockout)
- Comprehensive audit logging
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- CORS configuration with environment-based origins
- Request deduplication (prevents duplicate API calls)
- Token refresh caching (reduces unnecessary refresh calls)

## ⚡ Performance Optimizations

### Frontend
- **Request Deduplication** - Prevents duplicate concurrent API requests
- **API Response Caching** - 30-second cache for GET requests (reduces rate limiting)
- **Component Memoization** - React.memo, useMemo, useCallback for optimized renders
- **Lazy Loading** - Chart components loaded on-demand (code splitting)
- **Custom Hooks** - Reusable data fetching hooks with built-in caching
- **Middleware Optimization** - Token refresh caching to prevent duplicate refresh calls

### Backend
- **Rate Limiting** - Configurable limits (disabled in development for testing)
- **Database Indexing** - Optimized queries with proper indexes
- **Token Rotation** - Refresh tokens rotated on each use
- **Efficient Pagination** - Cursor-based pagination for transactions

## 📁 Project Structure

```
finance-tracker-app/
├── client/          # Next.js frontend application
│   ├── app/         # App Router pages and API routes
│   ├── components/  # React components
│   ├── hooks/       # Custom React hooks
│   └── lib/         # Utility functions and API client
├── server/          # NestJS backend API
│   ├── src/         # Source code
│   └── prisma/      # Database schema and migrations
└── README.md        # This file
```

## 🚦 Getting Started

### Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finance-tracker-app
   ```

2. **Configure environment**
   ```bash
   cp .env.sample .env
   # Edit .env with your values (see .env.sample for required variables)
   ```

3. **Start services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3010

### Local Development (Without Docker)

1. **Prerequisites**
   - Node.js 22.12.0+
   - PostgreSQL 16+
   - npm or yarn

2. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. **Set up environment variables**
   - Copy `.env.sample` to `.env` in `finance-tracker-app/` directory
   - Configure database connection and secrets

4. **Set up database**
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend (port 3010)
   cd server && npm run start:dev

   # Terminal 2 - Frontend (port 3000)
   cd client && npm run dev
   ```

### Documentation

- **[SETUP.md](../SETUP.md)** - Complete setup and configuration guide
- **[Deploy.md](./Deploy.md)** - Production deployment tutorial
- **[SECURITY.md](../SECURITY.md)** - Security best practices and secrets management
- **[.env.sample](./.env.sample)** - Environment variables template

## 📚 Learning Objectives

This project serves as a comprehensive learning exercise covering:

- **Next.js:** App Router, Server Components, API Routes, Middleware
- **React:** Custom hooks, memoization, lazy loading, performance optimization
- **NestJS:** Modules, Controllers, Services, Guards, DTOs, Dependency Injection
- **System Architecture:** RESTful API design, separation of concerns, microservices patterns
- **Security:** Authentication, authorization, input validation, XSS/CSRF prevention, secure headers
- **Performance:** Request deduplication, caching strategies, component optimization
- **Database:** Prisma ORM, migrations, indexing, query optimization, UUID implementation
- **Deployment:** Production-ready configurations, environment management

## 📝 License

This is a personal learning project.
