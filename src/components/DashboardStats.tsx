import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, IndianRupee, UtensilsCrossed, ChefHat } from "lucide-react";

interface Stats {
  totalOrders: number;
  todayRevenue: number;
  activeTables: number;
  kitchenQueue: number;
}

const DashboardStats = () => {
  const { ownerId, loading: roleLoading } = useStaffRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!ownerId) {
        setStats({ totalOrders: 0, todayRevenue: 0, activeTables: 0, kitchenQueue: 0 });
        setLoading(false);
        return;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [ordersRes, revenueRes, tablesRes, queueRes] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("orders").select("total_amount").eq("owner_id", ownerId).gte("created_at", today.toISOString()),
        supabase.from("restaurant_tables").select("*", { count: "exact", head: true }).eq("owner_id", ownerId).eq("is_active", true),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("owner_id", ownerId).in("status", ["new", "accepted", "preparing"]),
      ]);
      const todayRevenue = (revenueRes.data || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      setStats({ totalOrders: ordersRes.count || 0, todayRevenue, activeTables: tablesRes.count || 0, kitchenQueue: queueRes.count || 0 });
      setLoading(false);
    };
    if (roleLoading) return;
    setLoading(true);
    void fetchStats();
    if (!ownerId) return;
    const channel = supabase.channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${ownerId}` }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ownerId, roleLoading]);

  const cards = [
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, bgClass: "bg-primary/10", iconClass: "text-primary" },
    { label: "Today's Revenue", value: `₹${stats?.todayRevenue?.toLocaleString("en-IN") ?? 0}`, icon: IndianRupee, bgClass: "bg-success/10", iconClass: "text-success" },
    { label: "Active Tables", value: stats?.activeTables ?? 0, icon: UtensilsCrossed, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
    { label: "Kitchen Queue", value: stats?.kitchenQueue ?? 0, icon: ChefHat, bgClass: "bg-warning/10", iconClass: "text-warning" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-2">
            <Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <div className={`w-9 h-9 rounded-lg ${card.bgClass} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.iconClass}`} />
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
