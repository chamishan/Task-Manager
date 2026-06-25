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
    {
      title: "Set up project repository",
      description: "Initialize the monorepo with client and server folders.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-10),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Design database schema",
      description: "Model User and Task collections with relationships.",
      priority: "High",
      status: "Done",
      dueDate: inDays(-7),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "Implement authentication",
      description: "JWT access + refresh tokens with bcrypt hashing.",
      priority: "High",
      status: "Testing",
      dueDate: inDays(-1),
      createdBy: admin._id,
      assignedTo: alice._id,
    },
    {
      title: "Build task CRUD API",
      description: "Create, read, update, delete endpoints with RBAC scoping.",
      priority: "High",
      status: "In Progress",
      dueDate: inDays(2),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
    {
      title: "Add search and filtering",
      description: "Filter by status, priority, assignee; search by text.",
      priority: "Medium",
      status: "Open",
      dueDate: inDays(5),
      createdBy: alice._id,
      assignedTo: bob._id,
    },
    {
      title: "Fix login redirect bug",
      description: "Users are not redirected to dashboard after login.",
      priority: "Medium",
      status: "Blocked",
      dueDate: inDays(1),
      createdBy: bob._id,
      assignedTo: bob._id,
    },
    {
      title: "Write unit tests for services",
      description: "Cover the task service scoping logic with tests.",
      priority: "Low",
      status: "Open",
      dueDate: inDays(9),
      createdBy: bob._id,
      assignedTo: alice._id,
    },
    {
      title: "Set up CI pipeline",
      description: "Run lint and tests on every push.",
      priority: "Low",
      status: "Open",
      dueDate: inDays(14),
      createdBy: admin._id,
    },
    {
      title: "Prepare deployment configs",
      description: "Vercel for frontend, Render for backend, Atlas for DB.",
      priority: "Medium",
      status: "Open",
      dueDate: inDays(12),
      createdBy: admin._id,
      assignedTo: bob._id,
    },
    {
      title: "Polish dashboard UI",
      description: "Add charts, empty states, and loading skeletons.",
      priority: "Medium",
      status: "In Progress",
      dueDate: inDays(7),
      createdBy: alice._id,
      assignedTo: alice._id,
    },
  ]);

  console.log("\n✅ Seed complete!\n");
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
