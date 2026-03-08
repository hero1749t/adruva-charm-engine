import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, IndianRupee, UtensilsCrossed, ChefHat } from "lucide-react";

interface Stats {
  totalOrders: number;
  todayRevenue: number;
  activeTables: number;
  kitchenQueue: number;
}

const DashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [ordersRes, revenueRes, tablesRes, queueRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id),
        supabase
          .from("orders")
          .select("total_amount")
          .eq("owner_id", user.id)
          .gte("created_at", today.toISOString()),
        supabase
          .from("restaurant_tables")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("is_active", true),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .in("status", ["new", "accepted", "preparing"]),
      ]);

      const todayRevenue = (revenueRes.data || []).reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0
      );

      setStats({
        totalOrders: ordersRes.count || 0,
        todayRevenue,
        activeTables: tablesRes.count || 0,
        kitchenQueue: queueRes.count || 0,
      });
      setLoading(false);
    };

    fetchStats();

    const channel = supabase
      .channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${user.id}` }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const cards = [
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: "text-primary" },
    { label: "Today's Revenue", value: `₹${stats?.todayRevenue?.toLocaleString("en-IN") ?? 0}`, icon: IndianRupee, color: "text-green-500" },
    { label: "Active Tables", value: stats?.activeTables ?? 0, icon: UtensilsCrossed, color: "text-blue-500" },
    { label: "Kitchen Queue", value: stats?.kitchenQueue ?? 0, icon: ChefHat, color: "text-yellow-500" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <card.icon className={`w-5 h-5 ${card.color}`} />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
