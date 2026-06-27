import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStandup } from "@/hooks/useAi";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StandupButton() {
  const [open, setOpen] = useState(false);
  const standup = useStandup();

  const handleOpen = async () => {
    setOpen(true);
    try {
      await standup.mutateAsync();
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't generate the standup"));
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="bg-brand-gradient border-0 text-white hover:opacity-90"
      >
        <Sparkles className="size-4" />
        Generate standup
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Daily standup summary</DialogTitle>
            <DialogDescription>
              AI-generated from your current tasks.
            </DialogDescription>
          </DialogHeader>

          {standup.isPending && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </div>
          )}

          {standup.isError && (
            <p className="py-10 text-center text-sm text-destructive">
              Couldn&apos;t generate the summary. Please try again.
            </p>
          )}

          {!standup.isPending && !standup.isError && standup.data && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {standup.data}
              </ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
