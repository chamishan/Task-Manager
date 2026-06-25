import mongoose from "mongoose";
import { Task, type ITask } from "../models/Task.js";
import { User, type UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ListQuery,
} from "../validators/task.validator.js";

interface Requester {
  id: string;
  role: UserRole;
}

const POPULATE = [
  { path: "createdBy", select: "name email" },
  { path: "assignedTo", select: "name email" },
];

/** Admins see everything; users only see tasks they created or are assigned. */
function scopeFilter(user: Requester) {
  if (user.role === "admin") return {};
  return { $or: [{ createdBy: user.id }, { assignedTo: user.id }] };
}

function assertValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid id", 400);
}

/** A non-admin may only touch tasks they created or are assigned to. */
function assertCanAccess(user: Requester, task: ITask): void {
  if (user.role === "admin") return;
  const isCreator = task.createdBy.equals(user.id);
  const isAssignee = task.assignedTo?.equals(user.id) ?? false;
  if (!isCreator && !isAssignee) throw new AppError("Forbidden", 403);
}

async function assertAssigneeExists(assignedTo?: string): Promise<void> {
  if (!assignedTo) return;
  const exists = await User.exists({ _id: assignedTo });
  if (!exists) throw new AppError("Assigned user does not exist", 400);
}

export async function createTask(user: Requester, input: CreateTaskInput) {
  await assertAssigneeExists(input.assignedTo);
  const task = await Task.create({ ...input, createdBy: user.id });
  return task.populate(POPULATE);
}

export async function listTasks(user: Requester, q: ListQuery) {
  const filter = {
    $and: [
      scopeFilter(user),
      ...(q.status ? [{ status: q.status }] : []),
      ...(q.priority ? [{ priority: q.priority }] : []),
      ...(q.assignedTo ? [{ assignedTo: q.assignedTo }] : []),
      ...(q.search
        ? [
            {
              $or: [
                { title: { $regex: q.search, $options: "i" } },
                { description: { $regex: q.search, $options: "i" } },
              ],
            },
          ]
        : []),
      ...(q.dueAfter || q.dueBefore
        ? [
            {
              dueDate: {
                ...(q.dueAfter ? { $gte: q.dueAfter } : {}),
                ...(q.dueBefore ? { $lte: q.dueBefore } : {}),
              },
            },
          ]
        : []),
    ],
  };

  const sort: Record<string, 1 | -1> = {
    [q.sortBy]: q.order === "asc" ? 1 : -1,
  };

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate(POPULATE),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      total,
      page: q.page,
      limit: q.limit,
      pages: Math.ceil(total / q.limit),
    },
  };
}

export async function getTaskById(user: Requester, id: string) {
  assertValidId(id);
  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);
  assertCanAccess(user, task);
  return task.populate(POPULATE);
}

export async function updateTask(
  user: Requester,
  id: string,
  input: UpdateTaskInput
) {
  assertValidId(id);
  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);
  assertCanAccess(user, task);
  await assertAssigneeExists(input.assignedTo);

  Object.assign(task, input);
  await task.save();
  return task.populate(POPULATE);
}

export async function deleteTask(user: Requester, id: string): Promise<void> {
  assertValidId(id);
  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);
  assertCanAccess(user, task);
  await task.deleteOne();
}
