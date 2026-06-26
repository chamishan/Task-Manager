import { useMutation } from "@tanstack/react-query";
import { getStandup, suggestTask } from "@/api/ai";

export function useSuggestTask() {
  return useMutation({ mutationFn: (title: string) => suggestTask(title) });
}

export function useStandup() {
  return useMutation({ mutationFn: () => getStandup() });
}
