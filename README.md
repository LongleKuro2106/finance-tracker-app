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

## 🚀 API Routes

### Authentication (`/auth`)
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke tokens
- `GET /auth/me` - Get current user info

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
- `GET /analytics/categories` - Get category-wise breakdown

### Health Check
- `GET /health` - Service health check

## 🔒 Security Features

- JWT authentication with token rotation
- HttpOnly cookies for secure token storage
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- UUID-based transaction IDs (prevents enumeration)
- Account lockout after failed attempts
- Comprehensive audit logging
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- CORS configuration

## 📁 Project Structure

```
finance-tracker-app/
├── client/          # Next.js frontend application
├── server/          # NestJS backend API
└── README.md        # This file
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up environment variables .env in both client and sever

4. Run database migrations:
   ```bash
   cd server
   npx prisma migrate dev
   ```

5. Start development servers:
   ```bash
   # Terminal 1 - Backend (port 3010)
   cd server && npm run start:dev

   # Terminal 2 - Frontend (port 3000)
   cd client && npm run dev
   ```

## 📚 Learning Objectives

This project serves as a comprehensive learning exercise covering:

- **Next.js:** App Router, Server Components, API Routes, Middleware
- **NestJS:** Modules, Controllers, Services, Guards, DTOs, Dependency Injection
- **System Architecture:** RESTful API design, separation of concerns, microservices patterns
- **Security:** Authentication, authorization, input validation, XSS/CSRF prevention, secure headers
- **Database:** Prisma ORM, migrations, indexing, query optimization
- **Deployment:** Production-ready configurations, environment management

## 📝 License

This is a personal learning project.
