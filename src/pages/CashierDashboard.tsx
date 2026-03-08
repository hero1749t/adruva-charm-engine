import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import OwnerLayout from "@/components/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { IndianRupee, Receipt } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderWithItems = Order & { order_items: OrderItem[] };

const statusColors: Record<string, string> = {
  ready: "bg-green-500 text-primary-foreground",
  served: "bg-muted text-muted-foreground",
  new: "bg-primary text-primary-foreground",
  accepted: "bg-blue-500 text-primary-foreground",
  preparing: "bg-yellow-500 text-foreground",
};

const CashierDashboard = () => {
  const { user } = useAuth();
  const { loading: roleLoading } = useStaffRole();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("billing");

  const fetchOrders = async () => {
    if (!user) return;

    // Cashier needs to find their owner_id from staff_members
    const { data: staffData } = await supabase
      .from("staff_members")
      .select("restaurant_owner_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const ownerId = staffData?.restaurant_owner_id || user.id;

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (filter === "billing") {
      query = query.in("status", ["ready", "served"]);
    } else if (filter === "active") {
      query = query.in("status", ["new", "accepted", "preparing", "ready"]);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders((data as OrderWithItems[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading) {
      setLoading(true);
      fetchOrders();
    }
  }, [user, filter, roleLoading]);

  useEffect(() => {
    if (!user) return;

    const setupRealtime = async () => {
      const { data: staffData } = await supabase
        .from("staff_members")
        .select("restaurant_owner_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const ownerId = staffData?.restaurant_owner_id || user.id;

      const channel = supabase
        .channel("cashier-realtime")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `owner_id=eq.${ownerId}`,
        }, () => fetchOrders())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    setupRealtime();
  }, [user]);

  const markServed = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "served" as Order["status"] })
      .eq("id", orderId);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("Order marked as served");
      fetchOrders();
    }
  };

  const updatePayment = async (orderId: string, method: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_method: method })
      .eq("id", orderId);
    if (error) {
      toast.error("Failed to update payment");
    } else {
      toast.success(`Payment: ${method}`);
      fetchOrders();
    }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const todayTotal = orders
    .filter((o) => o.status === "served" || o.status === "ready")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const tabs = [
    { key: "billing", label: "🧾 Ready / Served" },
    { key: "active", label: "📋 All Active" },
    { key: "all", label: "All Orders" },
  ];

  return (
    <OwnerLayout>
      {/* Cashier header stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Orders to Bill</span>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {orders.filter((o) => o.status === "ready").length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Today's Collection</span>
            <IndianRupee className="w-5 h-5 text-green-500" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            ₹{todayTotal.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">Billing & Orders</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key)}
              className="whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No orders found</p>
          <p className="text-sm mt-2">Orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl border border-border p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">Table {order.table_number}</span>
                  <Badge className={statusColors[order.status] || ""}>{order.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
              </div>

              <div className="space-y-1 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.item_name}</span>
                    <span className="text-muted-foreground">₹{item.item_price}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-display font-bold text-xl">₹{order.total_amount}</span>
                <div className="flex gap-1.5">
                  {order.status === "ready" && (
                    <Button size="sm" variant="hero" onClick={() => markServed(order.id)}>
                      Mark Served
                    </Button>
                  )}
                </div>
              </div>

              {/* Payment method */}
              {(order.status === "ready" || order.status === "served") && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  {["cash", "upi", "card"].map((method) => (
                    <Button
                      key={method}
                      size="sm"
                      variant={order.payment_method === method ? "default" : "outline"}
                      className="flex-1 capitalize text-xs"
                      onClick={() => updatePayment(order.id, method)}
                    >
                      {method === "upi" ? "UPI" : method}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
};

export default CashierDashboard;
