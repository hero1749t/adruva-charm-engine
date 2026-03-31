import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, CreditCard, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalOwners: 0, activeSubs: 0, totalPlans: 0, revenue: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [profiles, subs, plans] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("owner_subscriptions").select("id, subscription_plans(price)").eq("status", "active"),
        supabase.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const revenue = (subs.data || []).reduce((sum: number, s: any) => sum + (s.subscription_plans?.price || 0), 0);

      setStats({
        totalOwners: profiles.count || 0,
        activeSubs: subs.data?.length || 0,
        totalPlans: plans.count || 0,
        revenue,
      });
    };
    fetch();
  }, []);

  const cards = [
    { label: "Total Owners", value: stats.totalOwners, icon: Users, color: "text-primary" },
    { label: "Active Subscriptions", value: stats.activeSubs, icon: CreditCard, color: "text-success" },
    { label: "Plans Created", value: stats.totalPlans, icon: Package, color: "text-warning" },
    { label: "Monthly Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold font-display mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
