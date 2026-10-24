
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const PALETTE = [
  "#22D3EE",
  "#38BDF8",
  "#34D399",
  "#818CF8",
  "#FBBF24",
  "#F87171",
  "#FB7185",
  "#A78BFA",
];

export default function AllocationChart({
  weights = {},
  centerLabel = "INVESTED",
  centerValue,
}) {
  const data = Object.entries(weights)
    .map(([symbol, weight]) => ({
      symbol,
      value: Number(weight),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full">
      {data.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
          No allocation data available.
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-[460px] grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
          <div className="relative h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="symbol"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.symbol}
                      fill={PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  cursor={false}
                  formatter={(value) => [
                    `${Number(value).toFixed(2)}%`,
                    "Allocation",
                  ]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    border: "1px solid #475569",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    color: "#F8FAFC",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                  }}
                  itemStyle={{
                    color: "#F8FAFC",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  labelStyle={{
                    color: "#CBD5E1",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "5px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {centerLabel}
              </span>
              <span className="mt-1 text-2xl font-semibold">
                {centerValue ?? `${total.toFixed(1)}%`}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {data.length} assets
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={item.symbol}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{
                    backgroundColor: PALETTE[index % PALETTE.length],
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {item.symbol}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {item.value.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
