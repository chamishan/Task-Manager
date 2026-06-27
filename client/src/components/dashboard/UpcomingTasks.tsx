import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/useTasks";
import { formatDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";

export function UpcomingTasks() {
  const { data, isLoading } = useTasks({
    sortBy: "dueDate",
    order: "asc",
    limit: 20,
  });

  // Soonest-due tasks that have a date and aren't done (overdue first).
  const tasks = (data?.tasks ?? [])
    .filter((t) => t.dueDate && t.status !== "Done")
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming &amp; overdue</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing due. You&apos;re all caught up. 🎉
          </p>
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <li key={task._id} className="flex items-center gap-3 py-2.5">
                  <Link
                    to={`/tasks/${task._id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <PriorityBadge priority={task.priority} />
                  <span
                    className={cn(
                      "w-24 shrink-0 text-right text-xs text-muted-foreground",
                      overdue && "font-medium text-destructive"
                    )}
                  >
                    {formatDate(task.dueDate)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
