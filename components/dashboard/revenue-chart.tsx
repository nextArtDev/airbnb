"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { faCompactMoney, faNumber } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

export type TrendDatum = {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  bookings: number;
};

const config = {
  revenue: { label: "درآمد", color: "#f43f5e" },
  bookings: { label: "رزرو", color: "#0ea5e9" },
} satisfies ChartConfig;

type Metric = "revenue" | "bookings";

export function RevenueChart({
  data,
  className,
}: {
  data: TrendDatum[];
  className?: string;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const isRevenue = metric === "revenue";

  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">روند عملکرد</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ۶ ماه اخیر · بر اساس رزروهای پرداخت‌شده
          </p>
        </div>
        <Tabs
          value={metric}
          onValueChange={(value) => setMetric(value as Metric)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="revenue" className="text-xs">
              درآمد
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs">
              تعداد رزرو
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div dir="ltr" className="mt-4">
        <ChartContainer
          config={config}
          className="h-[220px] w-full aspect-auto"
          initialDimension={{ width: 640, height: 220 }}
        >
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fill-metric" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isRevenue ? config.revenue.color : config.bookings.color}
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor={isRevenue ? config.revenue.color : config.bookings.color}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-[11px]"
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                isRevenue ? faCompactMoney(value) : faNumber(value)
              }
              className="text-[10px]"
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  labelKey="fullLabel"
                  indicator="line"
                  formatter={(value) =>
                    isRevenue
                      ? `${faCompactMoney(Number(value))} تومان`
                      : `${faNumber(Number(value))} رزرو`
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={isRevenue ? config.revenue.color : config.bookings.color}
              strokeWidth={2}
              fill="url(#fill-metric)"
              dot={{ r: 2.5, strokeWidth: 0, fill: isRevenue ? config.revenue.color : config.bookings.color }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
}
