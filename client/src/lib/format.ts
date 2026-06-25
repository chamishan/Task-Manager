import type { TaskStatus } from "@/types";

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** A task is overdue if its due date has passed and it isn't Done. */
export function isOverdue(
  dueDate: string | undefined | null,
  status: TaskStatus
): boolean {
  if (!dueDate || status === "Done") return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
