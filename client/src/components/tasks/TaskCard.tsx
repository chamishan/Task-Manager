import { Link } from "react-router-dom";
import { CalendarDays, User as UserIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/format";
import type { Task } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { TaskRowActions } from "./TaskRowActions";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({ task, onEdit, onDelete }: Props) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <Link
          to={`/tasks/${task._id}`}
          className="font-medium leading-snug hover:underline"
        >
          {task.title}
        </Link>
        <TaskRowActions task={task} onEdit={onEdit} onDelete={onDelete} />
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {task.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <p className="text-xs text-muted-foreground">
          Created by {task.createdBy?.name ?? "—"}
        </p>
      </CardContent>
      <CardFooter className="justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <UserIcon className="size-3.5" />
          {task.assignedTo?.name ?? "Unassigned"}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5",
            overdue && "font-medium text-destructive"
          )}
        >
          <CalendarDays className="size-3.5" />
          {formatDate(task.dueDate)}
        </span>
      </CardFooter>
    </Card>
  );
}
