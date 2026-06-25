import { api } from "@/lib/api";
import type { Role, TaskUserRef } from "@/types";

export interface UserOption extends TaskUserRef {
  role: Role;
}

export async function listUsers(): Promise<UserOption[]> {
  const res = await api.get("/users");
  return res.data.users;
}
