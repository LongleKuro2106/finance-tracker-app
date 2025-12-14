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

- **Frontend:** Next.js 16 (App Router), React 18, TypeScript, TailwindCSS
- **Backend:** NestJS, TypeScript, Prisma ORM
- **Database:** PostgreSQL 16
- **Authentication:** JWT with refresh tokens
- **Security:** Helmet, CORS, Rate Limiting, Input Validation
- **Containerization:** Docker & Docker Compose

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

## 🚀 API Routes (v1)

All API endpoints are versioned under `/v1` and follow RESTful conventions using only `GET`, `POST`, `PUT`, and `DELETE` methods.

### Authentication (`/v1/users`)
- `POST /v1/users/signup` - User registration
- `POST /v1/users/login` - User login
- `POST /v1/users/refresh` - Refresh access token
- `POST /v1/users/logout` - Logout and revoke tokens
- `GET /v1/users/me` - Get current user info
- `PUT /v1/users/me` - Update user profile (email, password) - Idempotent
- `DELETE /v1/users/me` - Delete user account (requires password confirmation) - Idempotent

### Transactions (`/v1/transactions`)
- `GET /v1/transactions` - List user transactions with query language support
- `POST /v1/transactions` - Create new transaction
- `PUT /v1/transactions/:id` - Update transaction - Idempotent
- `DELETE /v1/transactions/:id` - Delete transaction - Idempotent

**Query Language for GET /v1/transactions:**
- **Pagination**: `?page=1&size=20` (page-based) or `?cursor=uuid&limit=20` (cursor-based)
- **Sorting**: `?sort=date:desc,amount:asc`
- **Filtering**:
  - `?type=eq:income` - Equals
  - `?amount=gt:100` - Greater than
  - `?amount=lt:1000` - Less than
  - `?categoryId=in:1,2,3` - In array
  - `?description=match:groceries` - String contains (case-insensitive)

### Budgets (`/v1/budgets`)
- `GET /v1/budgets` - List all user budgets
- `POST /v1/budgets` - Create monthly budget
- `GET /v1/budgets/:month/:year` - Get specific month's budget
- `PUT /v1/budgets/:month/:year` - Update budget - Idempotent
- `DELETE /v1/budgets/:month/:year` - Delete budget - Idempotent
- `GET /v1/budgets/status` - Get budget status for month/year (`?month=12&year=2024`)
- `POST /v1/budgets/:month/:year/preserve` - Preserve budget to next month
- `PUT /v1/budgets/:month/:year/preserve` - Toggle preserve setting - Idempotent

### Analytics (`/v1/analytics`)
- `GET /v1/analytics/overview` - Get financial overview (revenue, expenses, balance)
  - Query params: `?startDate=2024-01-01&endDate=2024-12-31`
- `GET /v1/analytics/monthly` - Get monthly trends (income vs expenses)
  - Query params: `?months=12&startDate=2024-01-01&endDate=2024-12-31`
- `GET /v1/analytics/daily` - Get daily spending for current month (expenses by day)
  - Query params: `?year=2024&month=12`
- `GET /v1/analytics/categories` - Get category-wise breakdown
  - Query params: `?startDate=2024-01-01&endDate=2024-12-31`

### Health Check
- `GET /health` - Service health check (unversioned)

## 📋 Query Language Reference

The API supports a flexible query language for filtering, sorting, and pagination:

### Pagination
- **Page-based**: `?page=1&size=20` (returns `{ data, pagination: { page, size, hasNext } }`)
- **Cursor-based**: `?cursor=uuid&limit=20` (returns `{ data, nextCursor, pageSize }`)

### Sorting
- **Single field**: `?sort=date:desc`
- **Multiple fields**: `?sort=date:desc,amount:asc`

### Filtering Operators
- `eq` - Equals: `?type=eq:income`
- `ne` - Not equals: `?type=ne:expense`
- `gt` - Greater than: `?amount=gt:100`
- `gte` - Greater than or equal: `?amount=gte:100`
- `lt` - Less than: `?amount=lt:1000`
- `lte` - Less than or equal: `?amount=lte:1000`
- `match` - String contains (case-insensitive): `?description=match:groceries`
- `in` - Value in array: `?categoryId=in:1,2,3`

### Example Query
```
GET /v1/transactions?page=1&size=20&sort=date:desc,amount:asc&type=eq:expense&amount=gt:50&categoryId=in:1,2,3
```

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
├── docker-compose.yml  # Docker Compose configuration
├── README.md        # This file
└── INSTALLATION.md  # Installation guide
```

## 📚 Learning Objectives

This project serves as a comprehensive learning exercise covering:

- **Next.js:** App Router, Server Components, API Routes, Proxy
- **React:** Custom hooks, memoization, lazy loading, performance optimization
- **NestJS:** Modules, Controllers, Services, Guards, DTOs, Dependency Injection
- **System Architecture:** RESTful API design, separation of concerns, monolith patterns
- **Security:** Authentication, authorization, input validation, XSS/CSRF prevention, secure headers
- **Performance:** Request deduplication, caching strategies, component optimization
- **Database:** Prisma ORM, migrations, indexing, query optimization, UUID implementation
- **Deployment:** Docker containerization, production-ready configurations, environment management

## 📖 Documentation

- **[INSTALLATION.md](./INSTALLATION.md)** - Step-by-step installation guide (npm and Docker)

## 🚦 Quick Start

For detailed installation instructions, see [INSTALLATION.md](./INSTALLATION.md).

**Quick overview:**
1. Install dependencies (`npm install` in both `client/` and `server/`)
2. Set up environment variables (copy `.env.sample` to `.env`)
3. Set up database (`npx prisma migrate dev` and `npx prisma db seed`)
4. Start development servers (`npm run start:dev` and `npm run dev`)

Or use Docker:
```bash
docker-compose up --build
```

## 📝 License

This is a personal learning project.
