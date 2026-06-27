import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/api/tasks";

export function useTaskStats() {
  return useQuery({
    queryKey: ["tasks", "stats"],
    queryFn: getStats,
  });
}
