import { useEffect, useState } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "@/types";
import { useUsers } from "@/hooks/useUsers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

type SortKey =
  | "createdAt-desc"
  | "createdAt-asc"
  | "dueDate-asc"
  | "dueDate-desc"
  | "title-asc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "createdAt-desc", label: "Newest" },
  { value: "createdAt-asc", label: "Oldest" },
  { value: "dueDate-asc", label: "Due soonest" },
  { value: "dueDate-desc", label: "Due latest" },
  { value: "title-asc", label: "Title A–Z" },
];

interface FilterBarProps {
  filters: TaskFilters;
  onChange: (patch: Partial<TaskFilters>) => void;
  onClear: () => void;
  view: "table" | "card";
  onViewChange: (view: "table" | "card") => void;
}

export function FilterBar({
  filters,
  onChange,
  onClear,
  view,
  onViewChange,
}: FilterBarProps) {
  const { data: users } = useUsers();
  const [search, setSearch] = useState(filters.search ?? "");

  // keep local input in sync when filters are cleared/changed externally
  useEffect(() => {
    setSearch(filters.search ?? "");
  }, [filters.search]);

  // debounce search -> filters
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.search ?? "") !== search) {
        onChange({ search: search || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filters.search, onChange]);

  const sortValue: SortKey =
    `${filters.sortBy ?? "createdAt"}-${filters.order ?? "desc"}` as SortKey;

  const hasActiveFilters =
    Boolean(filters.status) ||
    Boolean(filters.priority) ||
    Boolean(filters.assignedTo) ||
    Boolean(filters.search);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select
        value={filters.status ?? ALL}
        onValueChange={(v) =>
          onChange({
            status: v === ALL ? undefined : (v as TaskStatus),
            page: 1,
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? ALL}
        onValueChange={(v) =>
          onChange({
            priority: v === ALL ? undefined : (v as TaskPriority),
            page: 1,
          })
        }
      >
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

      <Select
        value={filters.assignedTo ?? ALL}
        onValueChange={(v) =>
          onChange({ assignedTo: v === ALL ? undefined : v, page: 1 })
        }
      >
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

      <Select
        value={filters.createdBy ?? ALL}
        onValueChange={(v) =>
          onChange({ createdBy: v === ALL ? undefined : v, page: 1 })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Created by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any creator</SelectItem>
          {users?.map((u) => (
            <SelectItem key={u._id} value={u._id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sortValue}
        onValueChange={(v) => {
          const [sortBy, order] = v.split("-") as [
            TaskFilters["sortBy"],
            TaskFilters["order"],
          ];
          onChange({ sortBy, order });
        }}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="size-4" />
          Clear
        </Button>
      )}

      <div className="ml-auto flex items-center rounded-md border p-0.5">
        <Button
          variant={view === "table" ? "secondary" : "ghost"}
          size="icon"
          className="size-8"
          onClick={() => onViewChange("table")}
          aria-label="Table view"
        >
          <List className="size-4" />
        </Button>
        <Button
          variant={view === "card" ? "secondary" : "ghost"}
          size="icon"
          className="size-8"
          onClick={() => onViewChange("card")}
          aria-label="Card view"
        >
          <LayoutGrid className="size-4" />
        </Button>
      </div>
    </div>
  );
}
