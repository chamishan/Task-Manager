import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as tasksApi from "@/api/tasks";
import type {
  Task,
  TaskFilters,
  TaskInput,
  TaskListResponse,
} from "@/types";

const KEY = "tasks";

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: [KEY, "list", filters],
    queryFn: () => tasksApi.listTasks(filters),
    placeholderData: (prev) => prev, // keep current page visible while fetching next
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => tasksApi.getTask(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.createTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "list"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskInput> }) =>
      tasksApi.updateTask(id, input),

    // Optimistically patch scalar fields in every cached list so the UI
    // (e.g. an inline status change) updates instantly.
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: [KEY, "list"] });
      const snapshot = qc.getQueriesData<TaskListResponse>({
        queryKey: [KEY, "list"],
      });

      const patch: Partial<Task> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.status !== undefined) patch.status = input.status;
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate;

      qc.setQueriesData<TaskListResponse>(
        { queryKey: [KEY, "list"] },
        (old) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.map((t) =>
              t._id === id ? { ...t, ...patch } : t
            ),
          };
        }
      );

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: (task) => {
      qc.setQueryData([KEY, "detail", task._id], task);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: [KEY, "list"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "list"] }),
  });
}
