# Build Log — Task Management System

A running, detailed record of **how** the project was built and **why** each
decision was made. Written for two audiences: the engineer continuing the work,
and the interviewer who will discuss the thought process behind the app.

This document grows phase by phase. It currently covers **Phase 1** and
**Phase 2**.

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

## Current status

- ✅ **Phase 1** — Monorepo + backend foundation
- ✅ **Phase 2** — Auth + RBAC
- ✅ **Phase 3** — Task model + CRUD + RBAC scoping + filtering/search + seed
- ⏭️ **Phase 4 (next)** — Frontend auth: login/register UI, protected routes, axios refresh interceptor

The **entire backend API is now feature-complete** for the core requirements.
Remaining phases are frontend + bonus features + deployment.

### Roadmap (remaining)

| Phase | Scope |
| --- | --- |
| 4 | Frontend auth: login/register UI, protected routes, axios refresh interceptor |
| 5 | Task UI: list (table + cards), detail page, create/edit forms |
| 6 | Kanban board (drag-drop) + dashboard stats |
| 7 | AI features (Gemini): task description/priority suggester, admin standup summary |
| 8 | Tests + UX polish (loading/empty/error states, dark mode, overdue highlighting) |
| 9 | Deploy (Vercel + Render + Atlas) + finalize README |
