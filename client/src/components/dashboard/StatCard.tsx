import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: string;
}

export function StatCard({ label, value, icon: Icon, accent }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-lg bg-muted",
            accent
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
