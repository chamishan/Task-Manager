import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  type Task,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "@/types";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/tasks/FilterBar";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";

const LIMIT = 12;

function parseFilters(sp: URLSearchParams): TaskFilters {
  const get = (key: string) => sp.get(key) || undefined;
  const page = Number(sp.get("page"));
  return {
    status: get("status") as TaskStatus | undefined,
    priority: get("priority") as TaskPriority | undefined,
    assignedTo: get("assignedTo"),
    createdBy: get("createdBy"),
    search: get("search"),
    sortBy: (get("sortBy") as TaskFilters["sortBy"]) ?? "createdAt",
    order: (get("order") as TaskFilters["order"]) ?? "desc",
    page: page > 0 ? page : 1,
    limit: LIMIT,
  };
}

export default function TasksList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"table" | "card">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const filters = parseFilters(searchParams);
  const { data, isLoading, isError } = useTasks(filters);
  const updateTask = useUpdateTask();

  const patchFilters = useCallback(
    (patch: Partial<TaskFilters>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const openCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    updateTask.mutate({ id: task._id, input: { status } });
  };

  const tasks = data?.tasks ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {pagination ? `${pagination.total} task(s)` : "Loading…"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      <FilterBar
        filters={filters}
        onChange={patchFilters}
        onClear={clearFilters}
        view={view}
        onViewChange={setView}
      />

      {isLoading ? (
        <ListSkeleton view={view} />
      ) : isError ? (
        <EmptyState
          title="Couldn't load tasks"
          subtitle="Something went wrong. Please try again."
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          subtitle="Try adjusting your filters, or create a new task."
        />
      ) : view === "table" ? (
        <TaskTable
          tasks={tasks}
          onEdit={openEdit}
          onDelete={setDeletingTask}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={openEdit}
              onDelete={setDeletingTask}
            />
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => patchFilters({ page: pagination.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => patchFilters({ page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
      />
      <DeleteTaskDialog
        task={deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
      />
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-background py-16 text-center">
      <svg viewBox="0 0 96 96" className="mb-4 size-24" fill="none" aria-hidden>
        <rect
          x="22"
          y="14"
          width="52"
          height="68"
          rx="8"
          className="fill-muted stroke-border"
          strokeWidth="2"
        />
        <rect
          x="38"
          y="8"
          width="20"
          height="12"
          rx="4"
          className="fill-background stroke-border"
          strokeWidth="2"
        />
        <line
          x1="32"
          y1="36"
          x2="64"
          y2="36"
          className="stroke-muted-foreground/40"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="32"
          y1="48"
          x2="64"
          y2="48"
          className="stroke-muted-foreground/40"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="32"
          y1="60"
          x2="52"
          y2="60"
          className="stroke-muted-foreground/40"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="68" cy="68" r="14" className="fill-primary" />
        <path
          d="M62 68l4 4 8-8"
          className="stroke-primary-foreground"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ListSkeleton({ view }: { view: "table" | "card" }) {
  if (view === "card") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
