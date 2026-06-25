import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/types";

const styles: Record<TaskPriority, string> = {
  Low: "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300",
  Medium:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  High: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn(styles[priority])}>
      {priority}
    </Badge>
  );
}
