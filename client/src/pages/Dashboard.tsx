import { CheckCircle2, ClipboardList, Clock, ListTodo } from "lucide-react";
import { useTaskStats } from "@/hooks/useTaskStats";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { PriorityChart } from "@/components/dashboard/PriorityChart";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
import { StandupButton } from "@/components/dashboard/StandupButton";

export default function Dashboard() {
  const { data: stats, isLoading } = useTaskStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <StandupButton />
      </div>

      {/* Stat cards */}
      {isLoading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-22 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total tasks"
            value={stats.total}
            icon={ClipboardList}
          />
          <StatCard
            label="In progress"
            value={stats.inProgress}
            icon={ListTodo}
            accent="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon={Clock}
            accent="bg-red-500/15 text-red-600 dark:text-red-400"
          />
          <StatCard
            label="Completed"
            value={stats.done}
            icon={CheckCircle2}
            accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          />
        </div>
      )}

      {/* Charts */}
      {isLoading || !stats ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-85 w-full rounded-xl" />
          <Skeleton className="h-85 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusChart byStatus={stats.byStatus} />
          <PriorityChart byPriority={stats.byPriority} />
        </div>
      )}

      <UpcomingTasks />
    </div>
  );
}
