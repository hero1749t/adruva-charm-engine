type ChartValue = number | null | undefined;

const defaultValueFormatter = (value: number) => value.toLocaleString("en-IN");

export type DonutDatum = {
  name: string;
  value: number;
};

export const SimpleDonutChart = ({
  data,
  colors,
  size = 210,
  centerLabel = "Total",
  valueFormatter = defaultValueFormatter,
}: {
  data: DonutDatum[];
  colors: string[];
  size?: number;
  centerLabel?: string;
  valueFormatter?: (value: number) => string;
}) => {
  const sanitized = data.filter((entry) => entry.value > 0);
  const total = sanitized.reduce((sum, entry) => sum + entry.value, 0);

  if (!sanitized.length || total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No chart data available
      </div>
    );
  }

  let start = 0;
  const segments = sanitized.map((entry, index) => {
    const percentage = (entry.value / total) * 100;
    const color = colors[index % colors.length];
    const segment = `${color} ${start}% ${start + percentage}%`;
    start += percentage;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:justify-between">
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${segments.join(", ")})`,
        }}
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-background text-center shadow-inner">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {centerLabel}
          </span>
          <span className="mt-2 text-xl font-bold text-foreground">
            {valueFormatter(total)}
          </span>
        </div>
      </div>

      <div className="w-full space-y-2">
        {sanitized.map((entry, index) => {
          const color = colors[index % colors.length];
          const percentage = ((entry.value / total) * 100).toFixed(0);
          return (
            <div key={entry.name} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{entry.name}</span>
              <span className="text-xs text-muted-foreground">{percentage}%</span>
              <span className="text-sm font-semibold text-foreground">{valueFormatter(entry.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type BarDefinition<T extends Record<string, ChartValue>> = {
  key: keyof T & string;
  label: string;
  color: string;
};

export const SimpleVerticalBarChart = <T extends Record<string, string | number | null | undefined>>({
  data,
  xKey,
  bars,
  height = 220,
  valueFormatter = defaultValueFormatter,
}: {
  data: T[];
  xKey: keyof T & string;
  bars: BarDefinition<T>[];
  height?: number;
  valueFormatter?: (value: number) => string;
}) => {
  const numericValues = data.flatMap((entry) =>
    bars
      .map((bar) => Number(entry[bar.key] ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0),
  );
  const maxValue = Math.max(...numericValues, 1);

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No chart data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bars.length > 1 ? (
        <div className="flex flex-wrap gap-3">
          {bars.map((bar) => (
            <div key={bar.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bar.color }} />
              <span>{bar.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-full items-end gap-3" style={{ minHeight: height }}>
          {data.map((entry, index) => (
            <div key={`${String(entry[xKey])}-${index}`} className="flex min-w-[70px] flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1 rounded-2xl bg-muted/30 px-2 py-3">
                {bars.map((bar) => {
                  const rawValue = Number(entry[bar.key] ?? 0);
                  const normalized = Math.max(rawValue, 0);
                  const barHeight = `${Math.max((normalized / maxValue) * 100, normalized > 0 ? 8 : 0)}%`;
                  return (
                    <div key={bar.key} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[11px] text-muted-foreground">{normalized > 0 ? valueFormatter(normalized) : ""}</span>
                      <div
                        className="w-full rounded-t-xl transition-all"
                        style={{ height: barHeight, backgroundColor: bar.color }}
                        title={`${bar.label}: ${valueFormatter(normalized)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="text-center text-xs font-medium text-muted-foreground">
                {String(entry[xKey])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SimpleHorizontalBarChart = <T extends Record<string, string | number | null | undefined>>({
  data,
  labelKey,
  valueKey,
  color,
  valueFormatter = defaultValueFormatter,
}: {
  data: T[];
  labelKey: keyof T & string;
  valueKey: keyof T & string;
  color: string;
  valueFormatter?: (value: number) => string;
}) => {
  const maxValue = Math.max(...data.map((entry) => Number(entry[valueKey] ?? 0)), 1);

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No chart data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((entry, index) => {
        const rawValue = Number(entry[valueKey] ?? 0);
        const normalized = Math.max(rawValue, 0);
        const width = `${(normalized / maxValue) * 100}%`;
        return (
          <div key={`${String(entry[labelKey])}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-foreground">{String(entry[labelKey])}</span>
              <span className="text-xs text-muted-foreground">{valueFormatter(normalized)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width, backgroundColor: color }}
                title={valueFormatter(normalized)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

