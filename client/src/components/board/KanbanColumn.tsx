import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const statusDot: Record<TaskStatus, string> = {
  Open: "bg-blue-500",
  "In Progress": "bg-amber-500",
  Testing: "bg-purple-500",
  Blocked: "bg-red-500",
  Done: "bg-emerald-500",
};

interface Props {
  status: TaskStatus;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ status, count, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40 transition-colors",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={cn("size-2 rounded-full", statusDot[status])} />
          {status}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {count === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
