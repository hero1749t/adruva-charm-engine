import { Card } from "@/components/ui/card";
import {
  SimpleDonutChart,
  SimpleVerticalBarChart,
} from "@/components/charts/LightweightCharts";

interface TopDish {
  name: string;
  qty: number;
}

interface DailyRevenuePoint {
  day: string;
  revenue: number;
}

interface HourlyOrderPoint {
  hour: string;
  count: number;
}

interface OwnerAnalyticsChartsProps {
  dailyRevenue: DailyRevenuePoint[];
  topDishes: TopDish[];
  hourlyOrders: HourlyOrderPoint[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 220 70% 50%))",
  "hsl(var(--chart-3, 150 60% 40%))",
  "hsl(var(--chart-4, 30 80% 55%))",
  "hsl(var(--chart-5, 280 65% 60%))",
  "hsl(var(--muted-foreground))",
];

const OwnerAnalyticsCharts = ({
  dailyRevenue,
  topDishes,
  hourlyOrders,
}: OwnerAnalyticsChartsProps) => (
  <>
    <div className="grid lg:grid-cols-2 gap-6 mb-6">
      <Card className="p-4">
        <h2 className="font-display font-bold text-foreground mb-4">Daily Revenue</h2>
        {dailyRevenue.length > 0 ? (
          <SimpleVerticalBarChart
            data={dailyRevenue}
            xKey="day"
            bars={[{ key: "revenue", label: "Revenue", color: "hsl(var(--primary))" }]}
            height={220}
            valueFormatter={(value) => `Rs ${value.toLocaleString("en-IN")}`}
          />
        ) : (
          <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-display font-bold text-foreground mb-4">Top Dishes</h2>
        {topDishes.length > 0 ? (
          <SimpleDonutChart
            data={topDishes.map((dish) => ({ name: dish.name, value: dish.qty }))}
            colors={COLORS}
            centerLabel="Sold"
            valueFormatter={(value) => `${value}`}
          />
        ) : (
          <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
        )}
      </Card>
    </div>

    <Card className="p-4">
      <h2 className="font-display font-bold text-foreground mb-4">Orders by Hour</h2>
      {hourlyOrders.length > 0 ? (
        <SimpleVerticalBarChart
          data={hourlyOrders}
          xKey="hour"
          bars={[{ key: "count", label: "Orders", color: "hsl(var(--primary))" }]}
          height={200}
        />
      ) : (
        <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
      )}
    </Card>
  </>
);

export default OwnerAnalyticsCharts;

