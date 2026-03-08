import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  served: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const statusFlow: Record<string, string> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "served",
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.in("status", ["new", "accepted", "preparing", "ready"]);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders((data as OrderWithItems[]) || []);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user, filter]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${user.id}` },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as Order["status"] })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
    }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <OwnerLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Live Orders</h1>
        <div className="flex gap-2 mt-4">
          {["active", "all"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === "active" ? "Active Orders" : "All Orders"}
            </Button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No orders yet</p>
          <p className="text-sm mt-2">Orders will appear here in real-time when customers place them</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl border border-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">Table {order.table_number}</span>
                  <Badge className={statusColors[order.status] || ""}>
                    {order.status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
              </div>

              <div className="space-y-1 mb-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.item_name}</span>
                    <span className="text-muted-foreground">₹{item.item_price}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-display font-bold text-lg">₹{order.total_amount}</span>
                {statusFlow[order.status] && (
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => updateStatus(order.id, statusFlow[order.status])}
                  >
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
