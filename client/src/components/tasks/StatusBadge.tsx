import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const styles: Record<TaskStatus, string> = {
  Open: "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "In Progress":
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Testing:
    "border-transparent bg-purple-500/15 text-purple-700 dark:text-purple-300",
  Blocked: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
  Done: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn(styles[status])}>
      {status}
    </Badge>
  );
}
