# Build Log — Task Management System

A running, detailed record of **how** the project was built and **why** each
decision was made. Written for two audiences: the engineer continuing the work,
and the interviewer who will discuss the thought process behind the app.

This document grows phase by phase. It currently covers **Phases 1–7**.

---

## 0. High-level decisions (the "why" behind the whole project)

| Decision | Choice | Why |
| --- | --- | --- |
| Repository layout | **Single monorepo** (`/client` + `/server`) | One link to submit, one README, atomic commits across frontend/backend, easy to review. Separate hosting does **not** require separate repos — Vercel/Render just point at a subfolder. |
| Frontend | React + Vite + TypeScript | Assignment-preferred. Vite = fast dev/build. TS = type safety, a stated evaluation point. |
| Backend | Express + TypeScript | Assignment-required. TS end-to-end keeps types consistent across the stack. |
| Database | MongoDB + Mongoose | Flexible schema, fast to build, and MongoDB Atlas free tier never expires — important for keeping the live demo up through the interview. |
| Auth strategy | JWT: short-lived access token in memory + refresh token in httpOnly cookie | Avoids the common "JWT in localStorage" XSS pitfall. Refresh cookie is not readable by JS. |
| Hosting | Frontend → Vercel, Backend → Render, DB → MongoDB Atlas | All have usable free tiers; standard, well-documented combo. |

### Architectural principle: layered backend

Requests flow through clear layers so each file has one job:

```
route  ->  middleware (validate / auth / rbac)  ->  controller  ->  service  ->  model
```

- **routes** — declare endpoints and which middleware/handler runs. Thin.
- **middleware** — cross-cutting concerns (validation, auth, role checks, errors).
- **controllers** — read the request, call a service, shape the response. No business logic, no DB queries.
- **services** — business logic and database access. Reusable, testable.
- **models** — Mongoose schemas = the shape of the data.

This separation is the main thing the "code quality / maintainability" criterion
rewards, and it makes the app easy to extend (Task feature in Phase 3 reuses the
exact same skeleton).

---

## Phase 1 — Monorepo + backend foundation

**Goal:** a running, type-safe Express server that connects to MongoDB and
answers a health check — with linting/formatting in place from day one.

### What was created

```
task-manager/
├─ .gitignore
├─ README.md
├─ client/                 # (empty for now — built in Phase 4)
└─ server/
   ├─ .env                 # real local secrets (gitignored)
   ├─ .env.example         # template committed to git
   ├─ .prettierrc.json
   ├─ eslint.config.js
   ├─ package.json
   ├─ tsconfig.json
   └─ src/
      ├─ index.ts          # entry point — connect DB, start server
      ├─ app.ts            # builds the Express app (middleware + routes)
      ├─ config/
      │  ├─ env.ts         # validated environment variables
      │  └─ db.ts          # MongoDB connection
      └─ middleware/
         └─ errorHandler.ts
```

### Key decisions & details

**1. TypeScript with `NodeNext` modules + `"type": "module"`**
The project uses native ES Modules. Consequence you'll see everywhere: local
imports end in **`.js`** (e.g. `import { env } from "./config/env.js"`) even
though the source file is `.ts`. That's correct for `NodeNext` — the path refers
to the *compiled* output. `strict: true` is on, which (with the lint rule below)
enforces "no `any`".

**2. `tsx` for development**
`npm run dev` runs `tsx watch src/index.ts` — runs TypeScript directly with
hot-reload, no separate compile step while developing. `npm run build` uses real
`tsc` to emit `dist/` for production; `npm start` runs that compiled output.

**3. Validated environment config (`config/env.ts`)**
Instead of reading `process.env.X` scattered across the codebase, all env access
is centralized. A `required()` helper **throws on startup** if a critical
variable is missing — fail fast and loud rather than getting a confusing
`undefined` deep in the app later.

**4. Connection split from app (`config/db.ts` + `index.ts`)**
`index.ts` `await`s `connectDB()` **before** `app.listen()`. So if the server is
accepting requests, the database is guaranteed connected. `app.ts` only *builds*
the app (no side effects), which keeps it importable by tests later without
opening a DB connection or a port.

**5. Security & parsing middleware (in `app.ts`)**
- `helmet()` — sets safe HTTP headers.
- `cors({ origin: clientUrl, credentials: true })` — only the frontend origin is
  allowed, and `credentials: true` is required for the refresh cookie to work
  cross-origin.
- `express.json()` — parse JSON bodies.
- `cookieParser()` — read the refresh-token cookie.

**6. Central error handling (`middleware/errorHandler.ts`)**
- `notFound` — any unmatched route returns a consistent JSON 404.
- `errorHandler` — single place that turns errors into JSON responses.
  Registered **last** so it catches everything.

**7. Tooling from the start**
ESLint (flat config) + Prettier were set up immediately, not bolted on later.
The lint rule `@typescript-eslint/no-explicit-any: "error"` enforces the "no
`any`" quality goal mechanically.

### Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `GET /api/health` | `{ "status": "ok", "time": ... }` |
| Unknown route | `404 { "message": "Route not found: ..." }` |
| MongoDB | connected to local `taskManager` DB |

> **Database note:** development uses **local** MongoDB
> (`mongodb://localhost:27017/taskManager`). It lives only on the dev machine.
> The cloud database (MongoDB Atlas) is set up at deploy time (Phase 9) by
> swapping the `MONGODB_URI` env var — no code changes. Local dev data is
> disposable and re-created by the seed script (Phase 3).

---

## Phase 2 — Authentication + Authorization (RBAC)

**Goal:** users can register and log in; protected endpoints require a valid
token; roles (`admin` / `user`) gate access. This is the security backbone every
later feature relies on.

### What was added

```
server/src/
├─ models/
│  └─ User.ts                  # Mongoose user schema + password compare
├─ utils/
│  ├─ AppError.ts              # error class carrying an HTTP status
│  └─ tokens.ts               # sign/verify access & refresh JWTs
├─ types/
│  └─ express.d.ts            # adds `req.user` to Express types
├─ middleware/
│  ├─ auth.ts                 # requireAuth + requireRole (RBAC)
│  └─ validate.ts             # generic Zod body validator
├─ validators/
│  └─ auth.validator.ts       # register/login input schemas
├─ services/
│  └─ auth.service.ts         # register + credential verification
├─ controllers/
│  └─ auth.controller.ts      # register/login/refresh/logout/me
└─ routes/
   └─ auth.routes.ts          # /api/auth/* endpoints
```

New dependencies: `bcryptjs`, `jsonwebtoken` (+ their `@types`).

### The authentication model (most important part)

Two tokens, deliberately stored in two different places:

| Token | Lifetime | Stored where | Purpose |
| --- | --- | --- | --- |
| **Access token** | 15 min | In memory on the client (a JS variable) | Sent as `Authorization: Bearer <token>` on every API call |
| **Refresh token** | 7 days | **httpOnly cookie** | Used only to get a new access token when it expires |

**Why this design?**
- A short-lived access token limits the damage if it leaks.
- The refresh token is in an **httpOnly** cookie, so client-side JavaScript
  cannot read it — this defends against XSS token theft (the weakness of the
  common "store JWT in localStorage" approach).
- The cookie is scoped to `Path=/api/auth`, so it's only sent to the auth
  endpoints that actually need it, not on every API request.
- In production the cookie is `Secure` + `SameSite=None` (required because the
  Vercel frontend and Render backend are on different domains); in development
  it's `SameSite=Lax` over plain HTTP so it works locally.

**Refresh rotation:** every call to `/api/auth/refresh` issues a *new* refresh
token as well as a new access token — a small hardening step.

### Key decisions & details

**1. Password security (`User.ts` + `auth.service.ts`)**
- Passwords are **never stored** — only a `bcrypt` hash (cost factor 10).
- `passwordHash` has `select: false`, so it's excluded from query results by
  default. Login explicitly re-includes it with `.select("+passwordHash")`.
- A `toJSON` transform strips `passwordHash` and `__v` from every serialized
  user, so the hash can never leak through an API response. (Verified: it does
  not appear in register/login/me responses.)
- `comparePassword()` is a schema method that wraps `bcrypt.compare`.

**2. Roles & the "no self-promotion" rule**
- `role` is an enum (`admin` | `user`) defaulting to `user`.
- Public registration **always** creates a `user` — the API ignores any `role`
  in the request body. Admins are created only via the seed script (Phase 3).
  This prevents anyone from registering themselves as an admin.

**3. Typed JWTs (`utils/tokens.ts`)**
A single `JwtPayload` type (`{ sub, role }`) is used for signing and verifying,
so the token contents are consistent and type-checked everywhere.

**4. RBAC middleware (`middleware/auth.ts`)**
- `requireAuth` — reads the `Bearer` token, verifies it, and attaches
  `req.user = { id, role }`. Rejects missing/invalid/expired tokens with 401.
- `requireRole(...roles)` — a factory returning middleware that returns 403
  unless `req.user.role` is allowed. Used in Phase 3 to gate admin-only routes.

**5. Typing `req.user` (`types/express.d.ts`)**
Express's `Request` doesn't know about `user`. A global declaration-merge adds
`user?: { id, role }` so controllers get full type-safety/autocomplete with no
casting.

**6. Input validation (`middleware/validate.ts` + `validators/`)**
`validate(schema)` is a reusable middleware that runs a Zod schema against
`req.body`. On failure it returns a structured 400 listing each bad field; on
success it replaces `req.body` with the parsed, typed data. Validation lives at
the edge so controllers/services can trust their input.

**7. Consistent errors (`utils/AppError.ts`)**
Services throw `new AppError(message, status)` (e.g. `409` for duplicate email,
`401` for bad credentials). The central `errorHandler` reads that status; unknown
errors default to 500 (and only 5xx are logged to the console). This keeps error
responses uniform across the API.

**8. Leaning on Express 5**
Express 5 automatically forwards rejected promises from async route handlers to
the error handler. That's why the controllers use plain `async`/`await` and
`throw` with **no try/catch wrappers** — cleaner code. (In Express 4 this would
need a helper or `express-async-errors`.)

**9. Brute-force protection**
`express-rate-limit` caps `/login` and `/register` at 30 requests per 15 minutes
per IP.

### Endpoints added

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Create a `user` account |
| POST | `/api/auth/login` | public | Return access token + set refresh cookie |
| POST | `/api/auth/refresh` | refresh cookie | Issue a new access token (rotates refresh) |
| POST | `/api/auth/logout` | — | Clear the refresh cookie |
| GET | `/api/auth/me` | access token | Return the current user |

### Verification (manually exercised against the running server)

| Test | Expected | Result |
| --- | --- | --- |
| Register valid | 201, user without `passwordHash` | pass |
| Register duplicate email | 409 `Email already in use` | pass |
| Register invalid input | 400 with per-field errors | pass |
| Login valid | `accessToken` + `Set-Cookie: refreshToken … HttpOnly` | pass |
| Login wrong password | 401 `Invalid credentials` | pass |
| `GET /me` with token | current user | pass |
| `GET /me` without token | 401 `Unauthorized` | pass |
| `tsc --noEmit` / `lint` | clean | pass |

---

## Phase 3 — Task model + CRUD + RBAC scoping + seed

**Goal:** the core of the app — full task CRUD, with each task owned by users,
visibility scoped by role, plus filtering/search/sort/pagination and a seed
script that creates ready-to-use demo accounts.

### What was added

```
server/src/
├─ models/
│  └─ Task.ts                  # task schema + indexes
├─ validators/
│  └─ task.validator.ts        # create / update / list-query schemas
├─ services/
│  └─ task.service.ts          # CRUD + scoping + filter building
├─ controllers/
│  └─ task.controller.ts       # request/response only
├─ routes/
│  └─ task.routes.ts           # /api/tasks/* (all behind requireAuth)
└─ seed.ts                     # demo users + sample tasks
```

### The data model (`models/Task.ts`)

| Field | Type | Notes |
| --- | --- | --- |
| `title` | String (required, ≤200) | |
| `description` | String (≤2000) | optional |
| `priority` | enum `Low/Medium/High` | default `Medium` |
| `status` | enum `Open/In Progress/Testing/Blocked/Done` | default `Open` (extended statuses = a stated bonus) |
| `dueDate` | Date | optional |
| `createdBy` | ObjectId → User | required — who created it |
| `assignedTo` | ObjectId → User | optional — who it's assigned to |
| timestamps | createdAt / updatedAt | automatic |

`createdBy` / `assignedTo` are **references** (store the User `_id`); the service
uses `.populate()` to swap them for `{ name, email }` in responses, so the
frontend gets human-readable owner/assignee info without extra requests.
Indexes are declared on every field we filter or sort by (`createdBy`,
`assignedTo`, `status`, `priority`, `dueDate`) so queries stay fast as data grows.

### RBAC ownership scoping (the heart of the assignment)

The rule "admin sees all, users see only their own" lives in **one place** — the
service's `scopeFilter()`:

```
admin →  {}                                            (matches every task)
user  →  { $or: [{ createdBy: me }, { assignedTo: me }] }
```

- For **list** queries, this filter is the first condition `AND`-ed with any
  user-supplied filters, so a user can never widen their view past their own
  tasks.
- For **single-task** reads/updates/deletes, `assertCanAccess()` re-checks
  ownership on the loaded document and throws **403** for anyone who is neither
  the creator, the assignee, nor an admin.

Putting this in the service (not the controller or route) means the security
rule is defined once and reused by every operation — easy to audit and test.

### Filtering, search, sort, pagination (`GET /api/tasks`)

All optional query params, validated/coerced by a Zod `listQuerySchema` (with
safe defaults and a `limit` capped at 100 to prevent abuse):

| Param | Effect |
| --- | --- |
| `status`, `priority`, `assignedTo` | exact-match filters |
| `search` | case-insensitive regex over title + description |
| `dueBefore`, `dueAfter` | due-date range (enables "overdue" views later) |
| `sortBy` (`createdAt`/`dueDate`/`title`) + `order` (`asc`/`desc`) | sorting |
| `page`, `limit` | pagination |

The response includes pagination metadata the frontend needs for page controls:

```json
{ "tasks": [...], "pagination": { "total": 42, "page": 1, "limit": 20, "pages": 3 } }
```

### Key decisions & details

**1. PATCH for partial updates.** Update uses `PATCH` with a `.partial()` schema —
every field optional, but a `.refine()` rejects an empty body. The service loads
the doc, `Object.assign`s the changes, and calls `save()` so schema validators
run on the update.

**2. Referential integrity for `assignedTo`.** Before create/update, the service
verifies the target user actually exists (`assertAssigneeExists`) and returns
**400** otherwise — no tasks pointing at phantom users.

**3. Invalid IDs handled explicitly.** `assertValidId()` checks the ObjectId
format up front and returns **400** "Invalid id", instead of letting Mongoose
throw a confusing `CastError` (which would surface as a 500).

**4. Composing filters without clobbering scope.** A user's scope filter is a
`$or`; the search filter is *also* a `$or`. Merging them naively would overwrite
one. They are combined under a single top-level `$and` array so both always
apply — this is a real correctness/security detail.

**5. Mongoose 9 typing struggle (the filter section we had to rewrite).**
This was the one part that fought back, so it's worth documenting in full.

*What we were doing.* The list endpoint builds its MongoDB filter
**dynamically** — start with the role-scope rule, then add a condition for each
query param that's present. To keep it type-safe we wanted a real type on that
filter object instead of `any`. In Mongoose 8 and earlier that type has a famous
name: `FilterQuery<T>`.

*Why it broke — three failed attempts:*

1. `import { FilterQuery } from "mongoose"` → ❌ *"Module 'mongoose' has no
   exported member 'FilterQuery'."* **Mongoose 9 removed/renamed that type** — the
   name every tutorial uses is gone.
2. `mongoose.FilterQuery<ITask>` (via the namespace) → ❌ not there either.
   Digging into `node_modules`, the type still exists internally but is now
   called `QueryFilter<T>` **and has no `export`** — Mongoose keeps it private, so
   it cannot be imported.
3. Derive it from the function instead:
   `type TaskFilter = NonNullable<Parameters<typeof Task.find>[0]>` — *"the type of
   `find()`'s first argument."* It compiled, but the filter object then errored
   with `'$or' does not exist in type 'Query<...>'`, `'status' does not exist in
   type 'Query<...>'`, etc.

   The subtle reason: **`find()` is an *overloaded* function.** When you run
   `Parameters<>` on an overloaded function, TypeScript only reads the **last**
   overload — and `find()`'s last overload takes a generic `Query<any, any>`
   object (the query-builder `find` *returns*), **not** a filter. So `TaskFilter`
   became the wrong type, and TypeScript thought our filter literal was supposed
   to be a Mongoose *Query object*.

   So two problems collided: (a) Mongoose 9 stopped exporting the filter type's
   name, and (b) the methods are overloaded, so the "extract the parameter type"
   trick grabs the wrong signature.

*The fix — don't name the type; let the call site infer it.* Instead of typing a
separate variable and then passing it to `find()`, build the filter as **one
inline object literal passed straight into `find()`**:

```ts
// BEFORE — needs a name for the array's type (which doesn't exist in v9)
const and: FilterQuery<ITask>[] = [scopeFilter(user)];
if (q.status) and.push({ status: q.status });
if (q.priority) and.push({ priority: q.priority });
// ...
const filter: FilterQuery<ITask> = { $and: and };
await Task.find(filter);

// AFTER — no named type; TS validates the literal against find() directly
const filter = {
  $and: [
    scopeFilter(user),
    ...(q.status ? [{ status: q.status }] : []),
    ...(q.priority ? [{ priority: q.priority }] : []),
    ...(q.search ? [{ $or: [
      { title: { $regex: q.search, $options: "i" } },
      { description: { $regex: q.search, $options: "i" } },
    ]}] : []),
    // due-date range, etc.
  ],
};
await Task.find(filter);
```

*Why this works.* Passing the literal **directly** into `find(filter)` lets
TypeScript match it against the **correct** overload (chosen by the shape of the
argument), and Mongoose's own query-casting types accept exactly these shapes —
string IDs for ObjectId fields, `$regex` conditions, `$or`/`$and`. Result: it
type-checks with **no imported type, no `Parameters` trick, no `any`, no casts.**

*The only cost* was converting the imperative "make array → `if` → `push`" style
into a declarative array with **conditional spreads** (`...(cond ? [piece] :
[])`). Slightly denser, but fully type-clean.

*Lesson (interview-ready):* when a library's exported types fight you, don't fall
back to `any` — let the call site infer. Passing a literal straight into the
function makes TypeScript validate against the real signature instead of you
trying to rebuild the type by hand.

**6. Seed script (`seed.ts`, run with `npm run seed`).** Standalone script (not a
route). It clears the collections, creates **1 admin + 2 users**, and inserts
**10 realistic sample tasks** spread across statuses/priorities with mixed
past/future due dates. It prints the demo credentials at the end. This lets an
evaluator log in and see a populated app immediately.

> **Demo accounts** (password `Password123` for all):
> `admin@demo.com` (admin), `alice@demo.com` (user), `bob@demo.com` (user)

### Endpoints added (all require a valid access token)

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/tasks` | any user | Create (creator = current user) |
| GET | `/api/tasks` | any user | List (role-scoped + filters + pagination) |
| GET | `/api/tasks/:id` | owner/assignee/admin | Single task |
| PATCH | `/api/tasks/:id` | owner/assignee/admin | Partial update |
| DELETE | `/api/tasks/:id` | owner/assignee/admin | Delete |

### Verification (exercised against the running server with seeded data)

| Test | Expected | Result |
| --- | --- | --- |
| Admin lists all | 10 tasks | pass (10) |
| Alice scoped list | only her created/assigned | pass (6) |
| Bob scoped list | only his | pass (5) |
| Filter `status=Open` / `priority=High` | correct subsets | pass (4 / 4) |
| Search `login` | matching task only | pass |
| Create task | 201 | pass |
| Owner / admin GET task | 200 | pass |
| Non-owner GET / DELETE | 403 Forbidden | pass |
| Owner PATCH status | updated | pass |
| Owner DELETE | 204, then 404 on re-fetch | pass |
| Invalid ObjectId | 400 | pass |
| Non-existent `assignedTo` | 400 | pass |
| No token | 401 | pass |
| `tsc --noEmit` / `lint` | clean | pass |

---

## Phase 4 — Frontend foundation + Authentication

**Goal:** stand up the React app and make auth work end-to-end — register, log
in, stay logged in across reloads, and be redirected away from protected pages
when logged out — using the *same* security model as the backend (access token in
memory, refresh in the httpOnly cookie).

### What was added

```
client/
├─ .env / .env.example         # VITE_API_URL
├─ components.json             # shadcn config
├─ vite.config.ts             # react + tailwind plugins + "@" alias
├─ index.css                  # Tailwind v4 import + shadcn theme tokens
└─ src/
   ├─ main.tsx                # providers: Query, Router, Auth, Toaster
   ├─ App.tsx                 # route table
   ├─ lib/
   │  ├─ api.ts              # axios instance + single-flight refresh
   │  └─ utils.ts            # cn() (shadcn)
   ├─ auth/
   │  ├─ auth-context.ts     # context + value type
   │  ├─ AuthProvider.tsx    # user state, bootstrap, login/register/logout
   │  ├─ useAuth.ts          # hook
   │  ├─ ProtectedRoute.tsx  # redirect if logged out
   │  └─ RoleRoute.tsx       # redirect if wrong role (admin gate)
   ├─ pages/
   │  ├─ Login.tsx
   │  ├─ Register.tsx
   │  └─ Dashboard.tsx       # placeholder (real UI in Phase 5)
   ├─ components/
   │  ├─ ui/                 # shadcn: button, input, label, card, sonner
   │  └─ full-screen-loader.tsx
   └─ types/index.ts         # shared User/Role types
```

### Stack chosen (and why)

| Tool | Role | Why |
| --- | --- | --- |
| Vite + React 19 + TS | foundation | assignment-preferred; fast HMR |
| Tailwind **v4** + shadcn/ui | styling/components | v4 uses a Vite plugin (no `tailwind.config.js`); shadcn = accessible components whose code we own |
| React Router | routing | standard |
| TanStack Query | server state | caching/refetch (used heavily from Phase 5) |
| axios | HTTP | interceptors needed for the refresh flow |
| react-hook-form + zod | forms | typed validation mirroring the backend rules |

### The authentication flow (the substance of this phase)

**1. Access token in memory only (`lib/api.ts`).** A module-level variable holds
the access token; a request interceptor adds `Authorization: Bearer …`. It is
**never** in localStorage — same reasoning as the backend (XSS can't read it).
The axios instance uses `withCredentials: true` so the httpOnly refresh cookie is
sent.

**2. Silent refresh on startup (`AuthProvider`).** Because the in-memory token is
lost on reload, on mount the provider calls `POST /auth/refresh` once (cookie-
based) → on success it stores a new access token and loads `/auth/me`; on failure
the user is simply logged out. **This is how the session survives reloads without
localStorage.**

**3. Single-flight refresh interceptor (the tricky part).** On any `401`, the
response interceptor refreshes the token and retries the original request. If
several requests 401 at once, only **one** refresh runs — the rest wait in a
queue and are replayed with the new token. Without this "refresh mutex" you get a
storm of duplicate refreshes (and risk infinite loops).

**4. No refresh on auth endpoints.** A 401 from `/auth/login` means *wrong
password*, not *expired token* — so the interceptor explicitly skips refresh for
`/auth/login|register|refresh`. (Forgetting this is a classic infinite-loop bug.)

**5. Auto-login after register.** `register()` calls the register endpoint then
immediately `login()`, so a new user lands straight on the dashboard instead of
being bounced to the login screen.

**6. Route guards.** `ProtectedRoute` shows a loader while the startup refresh is
in flight (so the login page doesn't flash), then redirects to `/login` if there
is no user — remembering the intended destination so login can send them back.
`RoleRoute role="admin"` is ready for the admin-only pages in later phases.

### Key decisions & gotchas

- **Tailwind v4, not v3.** Setup is the `@tailwindcss/vite` plugin + a single
  `@import "tailwindcss"` in `index.css` with the shadcn theme as CSS variables —
  there is no `tailwind.config.js`.
- **`baseUrl` is deprecated in TS 6.** With `moduleResolution: "bundler"`, the
  `@/*` path alias works **without** `baseUrl` (paths resolve relative to the
  tsconfig), so we dropped it to avoid the deprecation error. The matching Vite
  alias lives in `vite.config.ts`.
- **Dev cookies just work; prod is already handled.** On localhost,
  `:5173`↔`:5000` are *same-site* (same-site ignores port), so the `SameSite=Lax`
  refresh cookie is sent. In production they're cross-site — which is exactly why
  the backend switches to `SameSite=None; Secure`. No code change needed.
- **Fast-Refresh-friendly file split.** The context object, provider component,
  and `useAuth` hook live in separate files so the linter's "only export
  components" rule stays happy.
- **New Vite scaffold uses `oxlint`** (not ESLint) for the client. Lint is clean
  apart from one warning inside shadcn's generated `button.tsx` (it exports
  `buttonVariants` next to the component — shadcn's standard pattern, left as-is).

### Verification

| Check | Result |
| --- | --- |
| `tsc -b` typecheck | clean |
| `oxlint` | clean (only the shadcn `button.tsx` warning) |
| `vite build` (production) | success (214 modules) |
| Dev server serves app | `<title>Task Manager</title>` |
| Backend + frontend run together | both up; integration live |

> **Browser flow to confirm manually:** register → land on dashboard; reload →
> still logged in (silent refresh); logout → redirected to `/login`; visit
> `/dashboard` while logged out → redirected; wrong password → inline error.

---

## Phase 5 — Task UI (list, detail, create/edit)

**Goal:** turn the API into a real, usable task manager — a filterable/searchable
task list (table **and** card views), a detail page, and a create/edit modal —
inside an app shell.

### Backend addition

- **`GET /api/users`** (auth required) → minimal `[{ _id, name, email, role }]`
  for the assignee dropdown. Same layered pattern (service → controller → route).
  *Not* full user management — just enough to assign tasks.

### Frontend added

```
client/src/
├─ api/            tasks.ts, users.ts          ← typed API calls
├─ hooks/          useTasks.ts, useUsers.ts    ← TanStack Query wrappers
├─ lib/            format.ts                    ← date + overdue + initials helpers
├─ components/
│  ├─ layout/      AppLayout.tsx               ← sidebar + topbar shell
│  └─ tasks/       StatusBadge, PriorityBadge, FilterBar, TaskTable,
│                  TaskCard, TaskStatusSelect, TaskRowActions,
│                  TaskFormDialog, DeleteTaskDialog
└─ pages/          TasksList.tsx, TaskDetail.tsx (+ Dashboard placeholder)
```

shadcn components pulled in: `table, select, dialog, textarea, badge,
dropdown-menu, skeleton, popover, calendar, separator, avatar, alert-dialog`.

### How it's structured

**1. Layered data access.** `api/*` does the typed axios calls; `hooks/*` wrap
them in TanStack Query. Pages never call axios directly — they use hooks. This
gives caching, background refetch, and a single place for cache rules.

**2. App shell (`AppLayout`).** Sidebar (Dashboard / Tasks) + topbar (avatar,
name, role, logout). All protected pages render through it via a nested
`<Outlet/>`, so navigation chrome is defined once.

**3. The task list (`TasksList`) — the centerpiece.**
- **Table view + card view** toggle (same data, two presentations).
- **Filters live in the URL** (`?status=Open&priority=High&page=2`) via
  `useSearchParams`, so the view is shareable and survives refresh. `parseFilters`
  reads them; `patchFilters` writes them (with `replace: true` to avoid history
  spam).
- **Debounced search** (400 ms) inside `FilterBar` so we don't refetch on every
  keystroke.
- **Pagination** driven by the API's `pagination` metadata; `placeholderData`
  keeps the current page on screen while the next loads (no flash to empty).
- **Loading skeletons, empty state, and error state** are all handled.

**4. Create/edit (`TaskFormDialog`).** A single modal does both — `task` prop
present = edit, absent = create. react-hook-form + zod, with a shadcn
calendar-popover date picker, an assignee `Select` (fed by `useUsers`), and a
sentinel `"unassigned"` value mapped to `undefined` (Radix selects can't have an
empty-string item). Success/error show as sonner toasts.

**5. Detail page (`TaskDetail`).** Full task info with edit/delete actions;
delete navigates back to the list.

### Notable decisions & gotchas

**1. Optimistic status changes with rollback (`useUpdateTask`).** Changing a
task's status from the table's inline `Select` updates the cache *immediately*
via `onMutate` (snapshot → patch every cached list), rolls back `onError`, and
reconciles `onSettled` with a refetch. To avoid corrupting the populated
`assignedTo` object, the optimistic patch only touches **scalar** fields
(title/description/priority/status/dueDate), never the assignee reference.

**2. Query-key design.** Keys are `["tasks","list",filters]` and
`["tasks","detail",id]`. Mutations invalidate `["tasks","list"]` (all filtered
lists) and write the fresh task into the detail cache. TanStack Query hashes keys
structurally, so passing a freshly-parsed `filters` object each render does **not**
cause refetches unless the contents actually change.

**3. Stable callbacks for the debounce.** `patchFilters` is wrapped in
`useCallback` keyed on `searchParams`, so `FilterBar`'s debounce effect isn't
reset by unrelated parent re-renders.

**4. Zod 4 email API.** `z.string().email()` is deprecated in Zod 4; switched the
auth forms to `z.email()`.

**5. Overdue rule** lives in one helper: `dueDate < now && status !== "Done"` —
used by both table and card to render the due date in red.

### Verification

| Check | Result |
| --- | --- |
| Backend `GET /api/users` (auth) | 4 users returned; 401 without token |
| `tsc -b` typecheck (client) | clean |
| `oxlint` | clean (only the shadcn `button.tsx`/`badge.tsx` variant-export warnings) |
| `vite build` (production) | success |

> **Bundle note:** the production JS is ~705 kB (216 kB gzipped) — fine for now;
> route-level code-splitting (`React.lazy`) is queued as a Phase 8 polish item.

> **Browser flow to confirm:** create a task → it appears; switch table/card;
> change status inline → updates instantly (optimistic); filter/search → URL
> updates and list narrows; open detail → edit → save; delete → confirm + toast;
> overdue tasks show red; a non-admin sees only their tasks, admin sees all.

---

## Phase 6 — Kanban board + Dashboard stats

**Goal:** the two most visual bonus features — a drag-and-drop Kanban board where
moving a card changes its status, and a dashboard with real metrics and charts.

### Backend addition — stats aggregation

`GET /api/tasks/stats` runs a **MongoDB aggregation** (`$match` for role scope →
`$group`) and returns counts by status, by priority, plus `total / done /
inProgress / overdue` — computed **in the database**, not by shipping every task
to the client.

- **Role-scoped in the pipeline.** The `$match` reuses the same scope rule, but in
  an aggregation Mongoose does **not** auto-cast strings to ObjectIds, so the
  user id is wrapped with `new mongoose.Types.ObjectId(id)` for the match to work.
- **Overdue is computed server-side** via `$cond` (`status != Done && dueDate !=
  null && dueDate < now`).
- Results are normalized to a full record (every status/priority present, zero-
  filled) so the frontend never has to guess missing buckets.
- **Route ordering matters:** `GET /tasks/stats` is registered **before**
  `GET /tasks/:id`, otherwise `"stats"` would be captured as an `:id`.

### Frontend added

```
client/src/
├─ hooks/         useTaskStats.ts
├─ components/
│  ├─ dashboard/  StatCard, StatusChart, PriorityChart, UpcomingTasks
│  └─ board/      KanbanColumn, KanbanCard
└─ pages/         Dashboard.tsx (rebuilt), Board.tsx
```

New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `recharts`
+ shadcn `chart`.

### Dashboard

- **4 stat cards** (Total / In progress / Overdue / Completed).
- **Two charts** via shadcn's `chart` wrapper over **recharts**: a status donut
  (`Pie`) and a priority bar chart, themed with the `--chart-*` CSS variables.
- **Upcoming & overdue list:** reuses `useTasks` sorted by due date, filtered
  client-side to dated, not-Done tasks (overdue first).
- Everything is **role-scoped automatically** because it rides the same API.

### Kanban board

- Five columns = the five statuses; cards grouped client-side from a single
  `useTasks({ limit: 100 })` fetch (boards don't paginate). Search / priority /
  assignee filters apply (local state + a debounced search).
- **dnd-kit:** each column is a `useDroppable`; each card a `useDraggable`.
  Dropping a card in a different column fires `useUpdateTask({ status })` — the
  **same optimistic mutation from Phase 5**, so the card moves instantly and the
  dashboard/list stay in sync.

### Notable decisions & gotchas

**1. Whole-card drag with an activation distance.** The entire card is the
draggable (not a tiny grip handle — that hurt discoverability; users drag the
card body). A `PointerSensor` `activationConstraint: { distance: 8 }` means a
**stationary click** still reaches the title link, while moving past 8px starts a
drag. The actions menu wrapper calls `stopPropagation` on `pointerDown` so
opening it never begins a drag.

**2. No persisted ordering.** Cross-column moves (status) are the meaningful
action and they persist; within-column order is **not** stored — the data model
has no `order` field and the assignment only needs the status workflow. A clear,
intentional scope decision rather than building an ordering system.

**3. Cache invalidation widened to `["tasks"]`.** Mutations now invalidate the
root tasks key (not just `["tasks","list"]`) so the **stats** query
(`["tasks","stats"]`) also refreshes after any create/update/delete — the
dashboard never drifts from the list/board.

**4. `DragOverlay` uses a lightweight preview**, not the real `KanbanCard`, to
avoid registering a second draggable with the same id during a drag.

### Verification

| Check | Result |
| --- | --- |
| `GET /api/tasks/stats` as admin | total 14, correct status/priority buckets |
| `GET /api/tasks/stats` as user (scoped) | total 10 (subset), buckets sum correctly |
| stats without token | 401 |
| `tsc -b` typecheck (client) | clean |
| `oxlint` | clean (only shadcn `button`/`badge` variant-export warnings) |
| `vite build` (production) | success |

> **Bundle note:** recharts pushes the bundle to ~1.1 MB (337 kB gzipped).
> Route-level code-splitting (`React.lazy`) is the planned Phase 8 fix.

> **Browser flow to confirm:** dashboard shows live counts + charts; drag a card
> to another column → status updates and survives reload; the list view reflects
> the change; admin vs user see different totals.

---

## Phase 7 — AI features (Gemini)

**Goal:** two practical, visible AI features powered by Google Gemini — an inline
task **suggester** and an admin **standup summary** — added without compromising
the security model or breaking the app when no key is present.

### Backend

```
server/src/
├─ services/      ai.service.ts      # Gemini client + suggest + standup
├─ controllers/   ai.controller.ts
├─ validators/    ai.validator.ts
└─ routes/        ai.routes.ts       # /api/ai/*
```

New dep: `@google/genai`. New env var: `GEMINI_API_KEY` (optional).

- **Model:** `gemini-2.5-flash` (fast, free tier).
- **`POST /api/ai/suggest`** (any auth user) — given a task `title`, returns
  `{ description, priority }`. Uses Gemini's **structured output**
  (`responseMimeType: application/json` + a `responseSchema`) so the result is
  always valid JSON with `priority ∈ {Low,Medium,High}` — no brittle text parsing.
- **`POST /api/ai/standup`** (**admin only**, via `requireRole("admin")`) —
  compiles all tasks into a compact list and asks Gemini for a grouped daily
  standup (in progress / blocked / overdue / done) in plain text.
- **Graceful degradation:** the Gemini client is created **lazily**; if
  `GEMINI_API_KEY` is missing the endpoints return a clean **503** ("AI not
  configured") instead of crashing. Other features are unaffected.
- **No leaking provider errors:** raw Google error payloads are caught and
  wrapped as a friendly **502** (the real error is logged server-side only).
- **Rate-limited:** AI routes are capped (15/min per IP) since calls cost quota.

### Frontend

```
client/src/
├─ api/        ai.ts                       # suggestTask, getStandup
├─ hooks/      useAi.ts                     # useSuggestTask, useStandup
└─ components/
   ├─ tasks/   TaskFormDialog.tsx (✨ button)
   └─ dashboard/ StandupButton.tsx
```

- **✨ "Suggest with AI"** in the create/edit dialog: type a title → click → the
  description and priority fields are filled via `setValue` (react-hook-form),
  with a spinner and toasts. Validates that a title exists first.
- **"Generate standup"** button on the Dashboard, rendered **only for admins**
  (`user.role === "admin"`), opening a dialog that streams in the summary with
  loading/error states.

### Notable decisions

- **Structured output over prompt-and-parse.** Asking Gemini for JSON via a
  schema removes a whole class of "the model returned prose" bugs.
- **Optional, not required, env var.** AI is additive — the app fully works
  without a key; only the two AI actions return 503. This keeps local dev and the
  deployed demo robust.
- **`.env` is read at startup.** Adding `GEMINI_API_KEY` requires a **server
  restart** (tsx watches `src/`, not `.env`) — noted here because it's an easy
  "why isn't my key working" gotcha.

### Verification

| Check | Result |
| --- | --- |
| `POST /ai/suggest` (valid key) | returns `{ description, priority }` JSON |
| `POST /ai/standup` as admin | returns a grouped summary |
| `POST /ai/standup` as non-admin | 403 |
| `POST /ai/suggest` without auth | 401 |
| no/invalid key | clean 502/503 (no raw Google error leaked) |
| `tsc` (server) + `tsc -b` (client) + lint + build | clean |

> Gemini key + model verified working end-to-end via a standalone probe
> (`gemini-2.5-flash`, both plain and JSON-schema calls).

---

## Phase 8 — Polish & refinements (in progress)

A batch of UX/correctness improvements after first hands-on testing.

- **Dark mode (default).** A small theme system (`src/theme/`): `ThemeProvider`
  toggles the `dark` class on `<html>` and persists to `localStorage`; `useTheme`
  + a `ThemeToggle` (sun/moon) in the sidebar. An inline script in `index.html`
  applies the stored/default-dark theme **before paint** to avoid a flash. The
  theme tokens were already defined in `index.css` from Phase 4.
- **Sidebar layout.** User avatar/name/role, the theme toggle, and **Log out**
  now live pinned to the **bottom of the sidebar** (desktop). The top bar is now
  mobile-only (nav + controls), since the sidebar is hidden on small screens.
- **AI standup rendering.** The summary is Markdown — it's now rendered with
  `react-markdown` + `remark-gfm` inside a Tailwind Typography (`prose
  dark:prose-invert`) container, instead of raw text with literal `**`/`###`.
- **Standup opened to everyone, scoped.** Previously admin-only; now any user can
  generate one. The service scopes it by role — **admin → team-wide**, **user →
  only their own tasks** (same `$or` ownership rule). The Dashboard button shows
  for all users.
- **Creator visibility + filter.** Added a **`createdBy`** filter to
  `GET /api/tasks` (and the filter bar), and the creator is now shown in the task
  **table** (new "Created by" column) and on each **card** — matching the SRS
  `createdBy`/`assignedTo` linkage. (Detail page already showed it.)
- **Assignment policy (decision).** Users *can* assign tasks to anyone, including
  an admin — intentional for a "team workflow app." The creator still owns/sees
  the task regardless of assignee.
- **One-click demo login.** The login page has "Quick demo login" buttons (Admin /
  User-Alice) that fill the credentials and sign in — zero friction for an
  evaluator. Demo password shown on-screen.
- **Brand theme (violet→blue).** Retheme the shadcn tokens to an indigo/violet
  primary on a slightly blue-tinted dark base (`index.css`). Glassmorphism is
  applied **selectively** — only the auth pages (glass card over a glowing
  `auth-bg` gradient) — while tables/kanban stay solid for readability. A
  `bg-brand-gradient` mark is used for the sidebar logo.
- **Fixed-height app shell + collapsible sidebar.** The shell is `h-svh` with
  only `<main>` scrolling, so the sidebar (and its pinned user/logout footer)
  stays put. The sidebar collapses to an icon rail (persisted to `localStorage`).
- **Visual polish pass.** Full-bleed image background on the auth pages (glass
  card + darkening gradient); the brand gradient reused as the "magic" cue on AI
  actions (✨ Suggest, Generate standup) and the auth CTAs; harmonized chart
  colors (violet→teal); slim themed scrollbars; card hover states; status-colored
  dots on board columns; branded favicon; and an empty-state illustration.

> Still queued for Phase 8: route-level **code-splitting** (`React.lazy`) — the
> bundle is ~1.27 MB after adding charts + markdown — and a few **tests**.

---

## Deferred / future enhancements

- **Email verification on signup.** Considered for this phase but **deferred** on
  purpose: it needs an email provider (Resend/SMTP) and, if blocking, would hurt
  the live demo (cold starts + evaluators stuck waiting on email/spam). If added
  later, the plan is **non-blocking** verification (use the app immediately;
  unverified shows a banner + "resend" action), with seeded demo accounts
  pre-verified. Password reset would reuse the same email plumbing.

---

## Current status

- ✅ **Phase 1** — Monorepo + backend foundation
- ✅ **Phase 2** — Auth + RBAC
- ✅ **Phase 3** — Task model + CRUD + RBAC scoping + filtering/search + seed
- ✅ **Phase 4** — Frontend foundation + auth (login/register, guards, refresh)
- ✅ **Phase 5** — Task UI (list table/cards, filters, detail, create/edit modal)
- ✅ **Phase 6** — Kanban board (drag-drop) + dashboard stats
- ✅ **Phase 7** — AI features (Gemini): task suggester + standup
- 🔄 **Phase 8 (in progress)** — Polish: dark mode ✓, sidebar ✓, markdown standup ✓,
  scoped standup-for-all ✓, creator filter ✓ · remaining: code-splitting, tests

All assignment requirements **and** the planned bonuses are complete. What's left
is finishing polish and deployment.

### Roadmap (remaining)

| Phase | Scope |
| --- | --- |
| 8 | Remaining polish: route code-splitting, a few tests |
| 9 | Deploy (Vercel + Render + Atlas) + finalize README |
