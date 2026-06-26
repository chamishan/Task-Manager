export type Role = "admin" | "user";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "Low" | "Medium" | "High";
export type TaskStatus =
  | "Open"
  | "In Progress"
  | "Testing"
  | "Blocked"
  | "Done";

export const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High"];
export const TASK_STATUSES: TaskStatus[] = [
  "Open",
  "In Progress",
  "Testing",
  "Blocked",
  "Done",
];

/** Populated user reference returned on a task. */
export interface TaskUserRef {
  _id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdBy: TaskUserRef;
  assignedTo?: TaskUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TaskListResponse {
  tasks: Task[];
  pagination: Pagination;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  createdBy?: string;
  search?: string;
  sortBy?: "createdAt" | "dueDate" | "title";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assignedTo?: string;
}

export interface TaskStats {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
}
