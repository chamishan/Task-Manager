import { api } from "@/lib/api";
import type {
  Task,
  TaskFilters,
  TaskInput,
  TaskListResponse,
  TaskStats,
} from "@/types";

export async function getStats(): Promise<TaskStats> {
  const res = await api.get("/tasks/stats");
  return res.data;
}

export async function listTasks(
  filters: TaskFilters
): Promise<TaskListResponse> {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params[key] = value as string | number;
    }
  });
  const res = await api.get("/tasks", { params });
  return res.data;
}

export async function getTask(id: string): Promise<Task> {
  const res = await api.get(`/tasks/${id}`);
  return res.data.task;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const res = await api.post("/tasks", input);
  return res.data.task;
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput>
): Promise<Task> {
  const res = await api.patch(`/tasks/${id}`, input);
  return res.data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
