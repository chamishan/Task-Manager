import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Plus, Search } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/types";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { KanbanCard } from "@/components/board/KanbanCard";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";

const ALL = "all";

export default function Board() {
  const { data: users } = useUsers();
  const updateTask = useUpdateTask();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>(ALL);
  const [assignedTo, setAssignedTo] = useState<string>(ALL);

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useTasks({
    limit: 100,
    search: search || undefined,
    priority: priority === ALL ? undefined : (priority as TaskPriority),
    assignedTo: assignedTo === ALL ? undefined : assignedTo,
  });

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // distance:8 → a stationary click reaches the card's link/menu; moving the
  // pointer past 8px starts a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const tasks = data?.tasks ?? [];
  const byStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const openCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveTask((event.active.data.current?.task as Task) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = active.data.current?.task as Task | undefined;
    const newStatus = over.id as TaskStatus;
    if (task && task.status !== newStatus) {
      updateTask.mutate({ id: task._id, input: { status: newStatus } });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
          <p className="text-sm text-muted-foreground">
            Drag a card to change its status.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All assignees</SelectItem>
            {users?.map((u) => (
              <SelectItem key={u._id} value={u._id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_STATUSES.map((s) => (
            <Skeleton key={s} className="h-96 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          autoScroll={false}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {TASK_STATUSES.map((status) => {
              const columnTasks = byStatus(status);
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  count={columnTasks.length}
                >
                  {columnTasks.map((task) => (
                    <KanbanCard
                      key={task._id}
                      task={task}
                      onEdit={openEdit}
                      onDelete={setDeletingTask}
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay modifiers={[restrictToWindowEdges]} dropAnimation={null}>
            {activeTask ? (
              <div className="w-72 rotate-3 rounded-md border bg-background p-3 shadow-lg">
                <p className="text-sm font-medium leading-snug">
                  {activeTask.title}
                </p>
                <div className="mt-2">
                  <PriorityBadge priority={activeTask.priority} />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
