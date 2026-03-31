import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Store, UtensilsCrossed, LayoutGrid, DoorOpen, Users, ShoppingCart, Package, Calendar } from "lucide-react";
import { format } from "date-fns";

interface OwnerProfile {
  user_id: string;
  full_name: string | null;
  restaurant_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface PlanInfo {
  name: string;
  price: number;
  max_tables: number | null;
  max_rooms: number | null;
  max_menu_items: number | null;
  max_staff: number | null;
  max_orders_per_month: number | null;
}

interface SubInfo {
  status: string | null;
  expires_at: string | null;
  starts_at: string | null;
  subscription_plans: PlanInfo | null;
}

interface UsageData {
  tables: number;
  rooms: number;
  menuItems: number;
  staff: number;
  totalOrders: number;
  monthOrders: number;
  categories: number;
  ingredients: number;
}

const UsageCard = ({ icon: Icon, label, current, max, color }: {
  icon: React.ElementType; label: string; current: number; max: number | null; color: string;
}) => {
  const hasLimit = max !== null && max !== undefined;
  const percentage = hasLimit && max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isAtLimit = hasLimit && current >= max!;
  const isNear = hasLimit && percentage >= 80;

  return (
    <Card className={`${isAtLimit ? "border-destructive/40" : isNear ? "border-yellow-500/40" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </div>
          {isAtLimit && <Badge variant="destructive" className="text-xs">Limit</Badge>}
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className={`text-2xl font-bold ${isAtLimit ? "text-destructive" : "text-foreground"}`}>
            {current}
          </span>
          {hasLimit && <span className="text-sm text-muted-foreground">/ {max}</span>}
        </div>
        {hasLimit && (
          <Progress
            value={percentage}
            className={`h-1.5 ${
              isAtLimit ? "[&>div]:bg-destructive" : isNear ? "[&>div]:bg-yellow-500" : "[&>div]:bg-primary"
            }`}
          />
        )}
      </CardContent>
    </Card>
  );
};

const AdminOwnerDetail = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    const fetchAll = async () => {
      const [profileRes, subRes, tablesRes, roomsRes, menuRes, staffRes, ordersRes, catsRes, ingredientsRes, monthOrdersRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", ownerId).maybeSingle(),
        supabase.from("owner_subscriptions").select("*, subscription_plans(*)").eq("owner_id", ownerId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("restaurant_rooms").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("staff_members").select("id", { count: "exact", head: true }).eq("restaurant_owner_id", ownerId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("menu_categories").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      if (profileRes.data) setProfile(profileRes.data as OwnerProfile);
      if (subRes.data) setSub(subRes.data as SubInfo);

      setUsage({
        tables: tablesRes.count || 0,
        rooms: roomsRes.count || 0,
        menuItems: menuRes.count || 0,
        staff: staffRes.count || 0,
        totalOrders: ordersRes.count || 0,
        monthOrders: monthOrdersRes.count || 0,
        categories: catsRes.count || 0,
        ingredients: ingredientsRes.count || 0,
      });

      setLoading(false);
    };
    fetchAll();
  }, [ownerId]);

  const plan = sub?.subscription_plans;

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Owner not found.</p>
        <Button variant="outline" onClick={() => navigate("/admin/owners")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back + Header */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/owners")} className="mb-4 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Owners
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            {profile.restaurant_name || "Unnamed Restaurant"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile.full_name} • {profile.phone || "No phone"} • Joined {format(new Date(profile.created_at), "dd MMM yyyy")}
          </p>
          {profile.address && <p className="text-xs text-muted-foreground mt-0.5">{profile.address}</p>}
        </div>
        <div className="flex items-center gap-2">
          {plan ? (
            <>
              <Badge variant="default" className="text-sm">{plan.name}</Badge>
              {sub?.expires_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Exp: {format(new Date(sub.expires_at), "dd MMM yyyy")}
                </span>
              )}
            </>
          ) : (
            <Badge variant="secondary">No Plan</Badge>
          )}
        </div>
      </div>

      {/* Usage Grid */}
      {usage && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <UsageCard icon={LayoutGrid} label="Tables" current={usage.tables} max={plan?.max_tables ?? null} color="bg-blue-500/10 text-blue-500" />
          <UsageCard icon={DoorOpen} label="Rooms" current={usage.rooms} max={plan?.max_rooms ?? null} color="bg-purple-500/10 text-purple-500" />
          <UsageCard icon={UtensilsCrossed} label="Menu Items" current={usage.menuItems} max={plan?.max_menu_items ?? null} color="bg-orange-500/10 text-orange-500" />
          <UsageCard icon={Users} label="Staff" current={usage.staff} max={plan?.max_staff ?? null} color="bg-green-500/10 text-green-500" />
          <UsageCard icon={ShoppingCart} label="Orders (This Month)" current={usage.monthOrders} max={plan?.max_orders_per_month ?? null} color="bg-primary/10 text-primary" />
          <UsageCard icon={ShoppingCart} label="Total Orders" current={usage.totalOrders} max={null} color="bg-muted text-muted-foreground" />
          <UsageCard icon={Package} label="Categories" current={usage.categories} max={null} color="bg-yellow-500/10 text-yellow-500" />
          <UsageCard icon={Package} label="Ingredients" current={usage.ingredients} max={null} color="bg-teal-500/10 text-teal-500" />
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOwnerDetail;
