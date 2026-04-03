import { Card } from "@/components/ui/card";
import {
  SimpleDonutChart,
  SimpleVerticalBarChart,
} from "@/components/charts/LightweightCharts";

interface CategoryPoint {
  value: string;
  label: string;
  emoji: string;
  total: number;
}

interface DailyExpensePoint {
  day: string;
  amount: number;
}

interface OwnerExpenseChartsProps {
  byCategory: CategoryPoint[];
  dailyExpenses: DailyExpensePoint[];
}

const CHART_COLORS = [
  "hsl(25, 100%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(220, 70%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(180, 60%, 45%)",
  "hsl(320, 60%, 50%)",
];

const OwnerExpenseCharts = ({
  byCategory,
  dailyExpenses,
}: OwnerExpenseChartsProps) => (
  <div className="grid lg:grid-cols-2 gap-6 mb-6">
    <Card className="p-5">
      <h2 className="font-display font-bold text-foreground mb-4">Daily Expenses</h2>
      {dailyExpenses.length > 0 ? (
        <SimpleVerticalBarChart
          data={dailyExpenses}
          xKey="day"
          bars={[{ key: "amount", label: "Expense", color: "hsl(var(--destructive))" }]}
          height={200}
          valueFormatter={(value) => `Rs ${value.toLocaleString("en-IN")}`}
        />
      ) : (
        <p className="text-muted-foreground text-sm text-center py-10">No expenses this month</p>
      )}
    </Card>

    <Card className="p-5">
      <h2 className="font-display font-bold text-foreground mb-4">By Category</h2>
      {byCategory.length > 0 ? (
        <SimpleDonutChart
          data={byCategory.map((category) => ({
            name: `${category.emoji} ${category.label}`,
            value: category.total,
          }))}
          colors={CHART_COLORS}
          centerLabel="Spend"
          valueFormatter={(value) => `Rs ${value.toLocaleString("en-IN")}`}
        />
      ) : (
        <p className="text-muted-foreground text-sm text-center py-10">No expenses this month</p>
      )}
    </Card>
  </div>
);

export default OwnerExpenseCharts;

