# Task Manager — Newnop Take-Home Assignment

A full-stack Task Management System built with React + Express + MongoDB.

**Live demo:** https://task-manager-chamath.vercel.app
**Repository:** https://github.com/chamathishanka/Task-Manager

---

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | Password123 |
| User | alice@demo.com | Password123 |

> Both accounts are available as one-click buttons on the login page — no typing needed.

---

## What was required vs what was built

### Required (all completed)

- [x] Create tasks with title, description, priority (Low / Medium / High), due date, status
- [x] List view (table + card toggle) and task detail page
- [x] Edit, update, delete tasks
- [x] Register / Login users
- [x] `createdBy` / `assignedTo` linked to users
- [x] Role-based access — users see only their own tasks, admins see all
- [x] Admin and User roles
- [x] Deployed to Vercel (frontend) + Railway (backend) + MongoDB Atlas

### Bonus (all completed)

- [x] JWT authentication with httpOnly refresh-token cookies and a single-flight refresh interceptor (concurrent 401s fire only one refresh)
- [x] Extended status workflow: **Open → In Progress → Testing → Blocked → Done**
- [x] Search and filtering by title, status, priority, assignee, and creator
- [x] Extra attention to UI/UX (see improvements below)

### Improvements beyond the spec

These were added to demonstrate real-world product thinking:

| Feature | What it does |
|---------|-------------|
| **Kanban board** | Drag-and-drop task management across status columns (dnd-kit) |
| **AI task suggestions** | Type a task title → Gemini generates description, priority, and due date |
| **AI daily standup** | One-click generates a structured standup summary from your live tasks |
| **Dashboard with charts** | Stats cards (total, in-progress, overdue, completed) + donut chart (by status) + bar chart (by priority) |
| **Dark mode** | System-aware default-dark theme toggle, no flash on load |
| **Collapsible sidebar** | Icon-rail collapse mode persisted to localStorage |
| **One-click demo login** | Evaluators can log in as Admin or Alice in one click on the login page |
| **Creator visibility** | Members can see who created each task; filter tasks by creator |
| **RBAC-scoped standup** | Admins see all tasks in their AI summary; members see only their own |
| **Rate limiting** | AI endpoints limited to 15 req/min per IP |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind v4, shadcn/ui |
| Backend | Express 5, TypeScript, NodeNext modules |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (access token in memory + 7-day refresh in httpOnly cookie) |
| AI | Google Gemini (`gemini-2.0-flash`) |
| Drag & drop | dnd-kit |
| Charts | Recharts |
| Deploy | Vercel (frontend) + Railway (backend) + MongoDB Atlas |

---

## Local setup

### Prerequisites

- Node 18+
- MongoDB running locally (`mongodb://localhost:27017`)

### Backend

```bash
cd server
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### Frontend

```bash
cd client
cp .env.example .env   # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

### Seed demo data

```bash
cd server
npm run seed
```

This creates `admin@demo.com` (Admin) and `alice@demo.com` / `bob@demo.com` (Users) with sample tasks.

---

## Environment variables

### Server (`server/.env.example`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend origin for CORS (no trailing slash) |
| `JWT_ACCESS_SECRET` | Secret for 15-min access tokens |
| `JWT_REFRESH_SECRET` | Secret for 7-day refresh tokens |
| `GEMINI_API_KEY` | Google AI Studio API key |

### Client (`client/.env.example`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api`) |

---

## Project structure

```
/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── auth/            # JWT auth context + axios interceptors
│   │   ├── components/
│   │   │   ├── board/       # Kanban drag-and-drop
│   │   │   ├── dashboard/   # Charts, stats, standup button
│   │   │   ├── layout/      # AppLayout, collapsible sidebar
│   │   │   └── tasks/       # Table, card, filters, form dialog
│   │   ├── pages/           # Dashboard, Tasks, Board, Login, Register, TaskDetail
│   │   └── hooks/           # React Query hooks for tasks, users, AI
│   └── vercel.json          # SPA catch-all rewrite rule
└── server/                  # Express 5 + TypeScript backend
    └── src/
        ├── config/          # Env validation, DB connection
        ├── middleware/       # Auth, RBAC, error handler, rate limiter
        ├── models/          # User, Task (Mongoose schemas)
        ├── routes/          # auth, tasks, users, ai
        └── services/        # Task service (RBAC scoping), AI service (Gemini)
```
