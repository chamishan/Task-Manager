import { Cell, Pie, PieChart } from "recharts";
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

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const config = { count: { label: "Tasks" } } satisfies ChartConfig;

export function StatusChart({ byStatus }: { byStatus: TaskStats["byStatus"] }) {
  const data = Object.entries(byStatus).map(([name, count]) => ({
    name,
    count,
  }));
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tasks by status</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <ChartContainer
              config={config}
              className="mx-auto aspect-square max-h-[220px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={data} dataKey="count" nameKey="name" innerRadius={50}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {data.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-medium">{d.count}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No tasks yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
