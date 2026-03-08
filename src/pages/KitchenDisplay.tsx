import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderWithItems = Order & { order_items: OrderItem[] };

const statusColors: Record<string, string> = {
  new: "bg-primary text-primary-foreground",
  accepted: "bg-blue-500 text-primary-foreground",
  preparing: "bg-yellow-500 text-foreground",
  ready: "bg-green-500 text-primary-foreground",
};

const statusFlow: Record<string, string> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
};

const KitchenDisplay = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [now, setNow] = useState(Date.now());

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", user.id)
      .in("status", ["new", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (data) setOrders(data as OrderWithItems[]);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("kitchen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${user.id}` }, () => {
        fetchOrders();
        // Play a sound for new orders
        try { new Audio("data:audio/wav;base64,UklGRl9vT19teleXBl...").play().catch(() => {}); } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Tick every 30s to update timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    await supabase.from("orders").update({ status: newStatus as Order["status"] }).eq("id", orderId);
    toast.success(`Order → ${newStatus}`);
    fetchOrders();
  };

  const minsAgo = (date: string) => {
    const mins = Math.floor((now - new Date(date).getTime()) / 60000);
    if (mins < 1) return "NOW";
    return `${mins}m`;
  };

  const urgencyClass = (date: string) => {
    const mins = Math.floor((now - new Date(date).getTime()) / 60000);
    if (mins >= 15) return "border-destructive ring-2 ring-destructive/30";
    if (mins >= 8) return "border-yellow-500 ring-2 ring-yellow-500/30";
    return "border-border";
  };

  // Group by status for columns
  const columns = [
    { key: "new", label: "🔔 New", orders: orders.filter(o => o.status === "new") },
    { key: "accepted", label: "👍 Accepted", orders: orders.filter(o => o.status === "accepted") },
    { key: "preparing", label: "🍳 Preparing", orders: orders.filter(o => o.status === "preparing") },
    { key: "ready", label: "✅ Ready", orders: orders.filter(o => o.status === "ready") },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">🍳 Kitchen Display</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{orders.length} active</span>
          <Button variant="outline" size="sm" onClick={fetchOrders}>Refresh</Button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-3 h-[calc(100vh-5rem)]">
        {columns.map((col) => (
          <div key={col.key} className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="font-display font-bold text-lg text-foreground">{col.label}</span>
              <Badge variant="secondary" className="text-xs">{col.orders.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {col.orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-card rounded-xl border-2 p-4 shadow-card ${urgencyClass(order.created_at)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-xl font-bold text-foreground">
                      T{order.table_number}
                    </span>
                    <span className={`text-sm font-bold ${
                      parseInt(minsAgo(order.created_at)) >= 15 ? "text-destructive" :
                      parseInt(minsAgo(order.created_at)) >= 8 ? "text-yellow-600" :
                      "text-muted-foreground"
                    }`}>
                      {minsAgo(order.created_at)}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 text-sm">
                        <span className="font-bold text-foreground min-w-[1.5rem]">{item.quantity}×</span>
                        <span className="text-foreground font-medium">{item.item_name}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 mb-3 italic">
                      📝 {order.notes}
                    </p>
                  )}

                  {statusFlow[order.status] && (
                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full"
                      onClick={() => updateStatus(order.id, statusFlow[order.status])}
                    >
                      → {statusFlow[order.status].toUpperCase()}
                    </Button>
                  )}
                </div>
              ))}
              {col.orders.length === 0 && (
                <div className="text-center text-muted-foreground py-10 text-sm">No orders</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDisplay;
