import { z } from "zod";

export const priorities = ["Low", "Medium", "High"] as const;
export const statuses = [
  "Open",
  "In Progress",
  "Testing",
  "Blocked",
  "Done",
] as const;

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(priorities).optional(),
  status: z.enum(statuses).optional(),
  dueDate: z.coerce.date().optional(),
  assignedTo: objectId.optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const listQuerySchema = z.object({
  status: z.enum(statuses).optional(),
  priority: z.enum(priorities).optional(),
  assignedTo: objectId.optional(),
  createdBy: objectId.optional(),
  search: z.string().trim().min(1).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "dueDate", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
