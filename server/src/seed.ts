import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Task } from "./models/Task.js";

const DEMO_PASSWORD = "Password123";

/** days from now -> Date (negative = in the past / overdue) */
const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function seed() {
  await connectDB();

  console.log("🌱 Clearing existing data...");
  await Promise.all([User.deleteMany({}), Task.deleteMany({})]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [admin, alice, bob] = await User.create([
    { name: "Admin", email: "admin@demo.com", passwordHash, role: "admin" },
    { name: "Alice", email: "alice@demo.com", passwordHash, role: "user" },
    { name: "Bob", email: "bob@demo.com", passwordHash, role: "user" },
  ]);

  console.log("📝 Creating sample tasks...");
  await Task.create([
    // ── Completed (past) ────────────────────────────────────────────────────
    {
      title: "Set up project repository",
      description: "Initialize the monorepo with client and server folders, configure TypeScript and ESLint.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-13),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Design database schema",
      description: "Model User and Task collections with relationships, add indexes on status and priority.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-11),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "Implement user registration and login",
      description: "JWT access + refresh tokens, bcrypt password hashing, httpOnly cookie for refresh.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-9),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Build task CRUD API",
      description: "Create, read, update, delete endpoints with RBAC scoping middleware.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-7),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "Role-based access control",
      description: "Admin sees all tasks; users see only tasks they created or are assigned to.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-7),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "Task list UI — table and card views",
      description: "Toggle between table and card layout, pagination controls, skeleton loaders.",
      priority: "Medium",
      status: "Done",
      dueDate: inDays(-5),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "Add search and filtering",
      description: "Filter tasks by status, priority, assignee, and creator. Full-text search on title.",
      priority: "Medium",
      status: "Done",
      dueDate: inDays(-4),
      createdBy: alice._id,
      assignedTo: bob._id,
    },
    {
      title: "Collapsible sidebar",
      description: "Sidebar collapses to icon-rail mode. State persisted to localStorage, smooth transition.",
      priority: "Low",
      status: "Done",
      dueDate: inDays(-3),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "Dark mode and theme toggle",
      description: "ThemeProvider with no-flash inline script, default dark, OKLCH colour palette.",
      priority: "Low",
      status: "Done",
      dueDate: inDays(-3),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "Deploy backend to Railway",
      description: "Configure Railway service, environment variables, healthcheck path, and Atlas whitelist.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-2),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "Deploy frontend to Vercel",
      description: "Set VITE_API_URL, add vercel.json SPA rewrite so deep links do not 404.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-2),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Rate limiting on AI endpoints",
      description: "express-rate-limit at 15 req/min per IP on /api/ai/*. Return 429 with Retry-After.",
      priority: "Medium",
      status: "Done",
      dueDate: inDays(-1),
      createdBy: admin._id,
      assignedTo: bob._id,
    },

    // ── Active this week ────────────────────────────────────────────────────
    {
      title: "Kanban board drag-and-drop",
      description: "dnd-kit board with five status columns. Drag updates task status via PATCH. DragOverlay follows cursor.",
      priority: "High",
      status: "In Progress",
      dueDate: inDays(2),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Dashboard stats and charts",
      description: "Stat cards for total / in-progress / overdue / completed, donut by status, bar by priority.",
      priority: "Medium",
      status: "In Progress",
      dueDate: inDays(2),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "AI task suggestion feature",
      description: "POST /api/ai/suggest takes a task title and returns structured description, priority, and due date via Gemini.",
      priority: "Medium",
      status: "In Progress",
      dueDate: inDays(3),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "AI daily standup summary",
      description: "POST /api/ai/standup generates a scoped standup from live tasks — admin sees all, users see their own.",
      priority: "Medium",
      status: "In Progress",
      dueDate: inDays(3),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Task detail page",
      description: "Full task view at /tasks/:id with inline edit, status dropdown, assignee change, and delete dialog.",
      priority: "Medium",
      status: "Testing",
      dueDate: inDays(1),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "Resolve CORS issue on Safari",
      description: "SameSite=None cookies blocked on Safari when backend is on a different subdomain. Needs investigation.",
      priority: "High",
      status: "Blocked",
      dueDate: inDays(1),
      createdBy: bob._id,
      assignedTo: bob._id,
    },
    {
      title: "Mobile responsive layout",
      description: "Sidebar collapses on small screens, table switches to card view below md breakpoint.",
      priority: "Medium",
      status: "Testing",
      dueDate: inDays(4),
      createdBy: admin._id,
      assignedTo: bob._id,
    },

    // ── Upcoming ─────────────────────────────────────────────────────────────
    {
      title: "Write integration tests for auth routes",
      description: "vitest + supertest covering register, login, refresh, and logout. Assert cookie flags and token rotation.",
      priority: "Low",
      status: "Open",
      dueDate: inDays(6),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "Set up CI/CD pipeline",
      description: "GitHub Actions workflow: lint, typecheck, and test on every push to main.",
      priority: "Low",
      status: "Open",
      dueDate: inDays(8),
      createdBy: admin._id,
    },
    {
      title: "Bundle size optimisation",
      description: "Route code-splitting with React.lazy + Suspense. Current bundle ~1.27 MB, target under 500 KB per chunk.",
      priority: "Medium",
      status: "Open",
      dueDate: inDays(9),
      createdBy: alice._id,
      assignedTo: bob._id,
    },
    {
      title: "Accessibility audit",
      description: "Run axe-core on all pages. Fix missing labels, keyboard traps, and colour contrast issues.",
      priority: "Medium",
      status: "Open",
      dueDate: inDays(10),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Email notification on task assignment",
      description: "Send a transactional email via Resend when a task is assigned to a user.",
      priority: "Low",
      status: "Open",
      dueDate: inDays(12),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "End-to-end smoke test on production",
      description: "Manual smoke test: login as admin and alice, create/edit/delete tasks, drag kanban, generate standup.",
      priority: "High",
      status: "Open",
      dueDate: inDays(5),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
  ]);

  console.log("\n✅ Seed complete — 25 tasks\n");
  console.log("Demo accounts (password for all: " + DEMO_PASSWORD + "):");
  console.log("  ADMIN  ->  admin@demo.com");
  console.log("  USER   ->  alice@demo.com");
  console.log("  USER   ->  bob@demo.com\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
