import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { IndianRupee, ShoppingBag, TrendingUp, Utensils, Download, Star, MessageSquare } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderWithItems = Order & { order_items: OrderItem[] };
type Review = Database["public"]["Tables"]["customer_reviews"]["Row"];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 220 70% 50%))",
  "hsl(var(--chart-3, 150 60% 40%))",
  "hsl(var(--chart-4, 30 80% 55%))",
  "hsl(var(--chart-5, 280 65% 60%))",
  "hsl(var(--muted-foreground))",
];

type Period = "today" | "7days" | "30days";

const OwnerAnalytics = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [period, setPeriod] = useState<Period>("7days");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    let from: Date;
    if (period === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "7days") {
      from = new Date(now.getTime() - 7 * 86400000);
    } else {
      from = new Date(now.getTime() - 30 * 86400000);
    }

    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", user.id)
      .gte("created_at", from.toISOString())
      .neq("status", "cancelled")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setOrders((data as OrderWithItems[]) || []);
        setLoading(false);
      });
  }, [user, period]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top dishes
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o) =>
      o.order_items.forEach((item) => {
        const existing = dishMap.get(item.item_name) || { name: item.item_name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += Number(item.item_price) * item.quantity;
        dishMap.set(item.item_name, existing);
      })
    );
    const topDishes = [...dishMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Daily revenue chart
    const dailyMap = new Map<string, number>();
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(o.total_amount));
    });
    const dailyRevenue = [...dailyMap.entries()].map(([day, revenue]) => ({ day, revenue }));

    // Hourly distribution
    const hourMap = new Map<number, number>();
    orders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const hourlyOrders = [...hourMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({
        hour: `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`,
        count,
      }));

    return { totalRevenue, totalOrders, avgOrder, topDishes, dailyRevenue, hourlyOrders };
  }, [orders]);

  const downloadCSV = () => {
    if (orders.length === 0) return;
    const rows = [["Order ID", "Date", "Time", "Table", "Items", "Total (₹)", "Status", "Phone"]];
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const items = o.order_items.map((i) => `${i.quantity}x ${i.item_name}`).join("; ");
      rows.push([
        o.id.slice(0, 8),
        d.toLocaleDateString("en-IN"),
        d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        String(o.table_number || ""),
        `"${items}"`,
        String(o.total_amount),
        o.status,
        o.customer_phone || "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <OwnerLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={orders.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          {([["today", "Today"], ["7days", "7 Days"], ["30days", "30 Days"]] as [Period, string][]).map(
            ([key, label]) => (
              <Button
                key={key}
                variant={period === key ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(key)}
              >
                {label}
              </Button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-display text-xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="font-display text-xl font-bold text-foreground">{stats.totalOrders}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                  <p className="font-display text-xl font-bold text-foreground">₹{stats.avgOrder.toFixed(0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Top Dish</p>
                  <p className="font-display text-sm font-bold text-foreground truncate max-w-[120px]">
                    {stats.topDishes[0]?.name || "—"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Revenue */}
            <Card className="p-4">
              <h2 className="font-display font-bold text-foreground mb-4">Daily Revenue</h2>
              {stats.dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.dailyRevenue}>
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number) => [`₹${v}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
              )}
            </Card>

            {/* Top Dishes Pie */}
            <Card className="p-4">
              <h2 className="font-display font-bold text-foreground mb-4">Top Dishes</h2>
              {stats.topDishes.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats.topDishes}
                        dataKey="qty"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        strokeWidth={2}
                      >
                        {stats.topDishes.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`${v} sold`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {stats.topDishes.map((dish, i) => (
                      <div key={dish.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-foreground truncate">{dish.name}</span>
                        <span className="text-muted-foreground ml-auto">{dish.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
              )}
            </Card>
          </div>

          {/* Hourly distribution */}
          <Card className="p-4">
            <h2 className="font-display font-bold text-foreground mb-4">Orders by Hour</h2>
            {stats.hourlyOrders.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.hourlyOrders}>
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
            )}
          </Card>
        </>
      )}
    </OwnerLayout>
  );
};

export default OwnerAnalytics;
