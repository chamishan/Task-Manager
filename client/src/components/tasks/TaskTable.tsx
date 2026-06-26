import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/format";
import type { Task, TaskStatus } from "@/types";
import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusSelect } from "./TaskStatusSelect";
import { TaskRowActions } from "./TaskRowActions";

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

export function TaskTable({ tasks, onEdit, onDelete, onStatusChange }: Props) {
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task._id}>
              <TableCell className="font-medium">
                <Link to={`/tasks/${task._id}`} className="hover:underline">
                  {task.title}
                </Link>
              </TableCell>
              <TableCell>
                <TaskStatusSelect
                  value={task.status}
                  onChange={(s) => onStatusChange(task, s)}
                />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={task.priority} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {task.assignedTo?.name ?? "Unassigned"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {task.createdBy?.name ?? "—"}
              </TableCell>
              <TableCell
                className={cn(
                  "text-sm",
                  isOverdue(task.dueDate, task.status) &&
                    "font-medium text-destructive"
                )}
              >
                {formatDate(task.dueDate)}
              </TableCell>
              <TableCell>
                <TaskRowActions
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
