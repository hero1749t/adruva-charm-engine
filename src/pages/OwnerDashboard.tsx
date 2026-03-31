import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import OwnerLayout from "@/components/OwnerLayout";
import DashboardStats from "@/components/DashboardStats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderWithItems = Order & { order_items: OrderItem[] };

const statusBadgeClass: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-warning/10 text-warning border-warning/20",
  ready: "bg-success/10 text-success border-success/20",
  served: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusFlow: Record<string, string> = {
  new: "accepted", accepted: "preparing", preparing: "ready", ready: "served",
};

const statusTabs = [
  { key: "active", label: "Active" },
  { key: "new", label: "New" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "all", label: "All" },
];

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { isOwner, isManager } = useStaffRole();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    let query = supabase.from("orders").select("*, order_items(*)")
      .eq("owner_id", user.id).order("created_at", { ascending: false });
    if (filter === "active") query = query.in("status", ["new", "accepted", "preparing", "ready"]);
    else if (filter !== "all") query = query.eq("status", filter as Order["status"]);
    const { data, error } = await query;
    if (error) toast.error("Failed to load orders");
    else setOrders((data as OrderWithItems[]) || []);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); fetchOrders(); }, [user, filter]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as Order["status"] }).eq("id", orderId);
    if (error) toast.error("Failed to update status");
    else { toast.success(`Order → ${newStatus}`); fetchOrders(); }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <OwnerLayout>
      {(isOwner || isManager) && <DashboardStats />}

      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">Orders</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {statusTabs.map((tab) => (
            <Button key={tab.key} variant={filter === tab.key ? "default" : "outline"} size="sm"
              onClick={() => setFilter(tab.key)} className="whitespace-nowrap">
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <Skeleton className="h-6 w-20" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
          <p className="text-lg">No orders found</p>
          <p className="text-sm mt-2">Orders appear here in real-time</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">Table {order.table_number}</span>
                  <Badge className={`border ${statusBadgeClass[order.status] || ""}`}>{order.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
              </div>
              <div className="space-y-1 mb-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.quantity}x {item.item_name}</span>
                    <span className="text-muted-foreground">₹{item.item_price}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-display font-bold text-lg">₹{order.total_amount}</span>
                {statusFlow[order.status] && (
                  <Button size="sm" onClick={() => updateStatus(order.id, statusFlow[order.status])}>
                    Mark {statusFlow[order.status]}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerDashboard;
