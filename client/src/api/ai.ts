import { api } from "@/lib/api";
import type { TaskPriority } from "@/types";

export interface TaskSuggestion {
  description: string;
  priority: TaskPriority;
}

export async function suggestTask(title: string): Promise<TaskSuggestion> {
  const res = await api.post("/ai/suggest", { title });
  return res.data;
}

export async function getStandup(): Promise<string> {
  const res = await api.post("/ai/standup");
  return res.data.summary;
}
