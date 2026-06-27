# Task Management System

A team workflow app to create, assign, track, and manage tasks with role-based
access and workflow states.

> Status: **in development**.

## Demo Accounts

After seeding (see [Seeding demo data](#seeding-demo-data)), log in with any of
these. **Password for all accounts: `Password123`**

| Role  | Email            | Password      |
| ----- | ---------------- | ------------- |
| Admin | `admin@demo.com` | `Password123` |
| User  | `alice@demo.com` | `Password123` |
| User  | `bob@demo.com`   | `Password123` |

> Admins see **all** tasks and can generate the AI standup summary. Regular users
> see only tasks they created or are assigned to.

## Tech Stack

| Layer    | Tech                                                              |
| -------- | ---------------------------------------------------------------- |
| Frontend | React + Vite + TypeScript, Tailwind + shadcn/ui, TanStack Query  |
| Backend  | Node.js + Express + TypeScript, Mongoose                         |
| Database | MongoDB                                                          |
| Auth     | JWT (in-memory access token + httpOnly refresh cookie), bcrypt   |
| AI       | Google Gemini (task suggester + admin standup summary)          |

## Project Structure

```
task-manager/
├─ client/        # React + Vite frontend
└─ server/        # Express + TypeScript API
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI

### Backend

```bash
cd server
npm install
cp .env.example .env   # then fill in values
npm run dev
```

The API runs at `http://localhost:5000`. Health check: `GET /api/health`.

### Seeding demo data

Populate the database with the demo accounts above plus sample tasks:

```bash
cd server
npm run seed
```

### Environment Variables (`server/.env`)

| Variable             | Description                              |
| -------------------- | ---------------------------------------- |
| `PORT`               | API port (default 5000)                  |
| `NODE_ENV`           | `development` / `production`             |
| `MONGODB_URI`        | MongoDB connection string                |
| `CLIENT_URL`         | Frontend origin (for CORS)               |
| `JWT_ACCESS_SECRET`  | Secret for short-lived access tokens     |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens                |
| `GEMINI_API_KEY`     | Google Gemini API key (AI features)      |

## Roadmap

- [x] Phase 1 — Monorepo + backend foundation (config, DB, health route)
- [ ] Phase 2 — User model + auth (register/login/refresh/logout) + RBAC
- [ ] Phase 3 — Task CRUD + filtering/search + seed script
- [ ] Phase 4 — Frontend auth + protected routes
- [ ] Phase 5 — Task UI (list/board/detail/forms)
- [ ] Phase 6 — Kanban + dashboard
- [ ] Phase 7 — AI features
- [ ] Phase 8 — Tests + polish
- [ ] Phase 9 — Deploy (Vercel + Render + Atlas)
