import { useDraggable } from "@dnd-kit/core";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/format";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskRowActions } from "@/components/tasks/TaskRowActions";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function KanbanCard({ task, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const overdue = isOverdue(task.dueDate, task.status);

  return (
    // The whole card is draggable. The PointerSensor's activation distance
    // (set in Board) lets a stationary click still reach the title link, while
    // any drag moves the card. The actions menu stops propagation so opening it
    // never starts a drag. The original card stays put (no transform) — the
    // DragOverlay is what follows the cursor.
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none rounded-md border bg-background p-3 shadow-sm transition-colors hover:border-primary/50 active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          to={`/tasks/${task._id}`}
          className="min-w-0 wrap-break-word text-sm font-medium leading-snug hover:underline"
        >
          {task.title}
        </Link>
        <div
          className="shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <TaskRowActions task={task} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground",
              overdue && "font-medium text-destructive"
            )}
          >
            <CalendarDays className="size-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
      {task.assignedTo && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {task.assignedTo.name}
        </p>
      )}
    </div>
  );
}
