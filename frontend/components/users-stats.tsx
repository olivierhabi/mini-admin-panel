import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

type Stat = { date: string; users: number };

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL


const UsersStats = ({ refreshTrigger }: { refreshTrigger?: number }) => {
    const [chartData, setChartData] = useState<Stat[] | null>(null);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState<string | null>(null);


    useEffect(() => {
        const ac = new AbortController();

        async function load() {
            setUsersLoading(true);
            setUsersError(null);
            try {
                const res = await fetch(`${BACKEND_URL}/users/stats`, {
                    signal: ac.signal,
                    headers: { "Accept": "application/json" },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const payload = await res.json();

                setChartData(payload);
            } catch (err: any) {
                if (err.name === "AbortError") return; // ignore
                setUsersError(err.message ?? "Failed to load stats");
            } finally {
                setUsersLoading(false);
            }
        }

        load();

        return () => ac.abort();
    }, [refreshTrigger]);


    const chartConfig = {
        desktop: {
            label: "Desktop",
            color: "var(--chart-1)",
        },
    } satisfies ChartConfig

    return (
        <Card className="w-[500px] h-[500px]">
            <CardHeader>
                <CardTitle>Users Created - last 7 days</CardTitle>
            </CardHeader>
            <CardContent>

                <div className="max-w-4xl mx-auto p-4">
                    {usersLoading && <div>Loading…</div>}
                    {usersError && <div className="text-red-600">{usersError}</div>}
                    {!usersLoading && chartData && chartData.length === 0 && <div>No Data</div>}

                    {chartData && (
                        <ChartContainer config={chartConfig}>
                            <BarChart
                                accessibilityLayer
                                data={chartData}
                                margin={{
                                    top: 20,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => {
                                        const date = new Date(value)
                                        return date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="users" fill="var(--color-desktop)" radius={8}>
                                    <LabelList
                                        position="top"
                                        offset={12}
                                        className="fill-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )

}

export default UsersStats