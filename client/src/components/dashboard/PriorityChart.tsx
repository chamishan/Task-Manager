import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TaskStats } from "@/types";

const config = {
  count: { label: "Tasks", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function PriorityChart({
  byPriority,
}: {
  byPriority: TaskStats["byPriority"];
}) {
  const data = Object.entries(byPriority).map(([name, count]) => ({
    name,
    count,
  }));
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tasks by priority</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={config} className="h-[260px] w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={6} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No tasks yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
