import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, BellOff, RefreshCw } from "lucide-react";
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

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      osc.connect(gainNode);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {}
};

const sendBrowserNotification = (order: { table_number: number | null; order_items: OrderItem[] }) => {
  if (Notification.permission !== "granted") return;
  const items = order.order_items.map((i) => `${i.quantity}× ${i.item_name}`).join(", ");
  new Notification(`🔔 New Order — Table ${order.table_number || "?"}`, {
    body: items || "New order received",
    icon: "/favicon.ico",
    tag: "new-order",
  });
};

const KitchenDisplay = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const [activeTab, setActiveTab] = useState<string>("all");
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", user.id)
      .in("status", ["new", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (data) {
      const fetched = data as OrderWithItems[];
      const newOrders = fetched.filter(
        (o) => o.status === "new" && !prevOrderIdsRef.current.has(o.id)
      );
      if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        playNotificationSound();
        newOrders.forEach((o) => sendBrowserNotification(o));
        toast.success(`🔔 ${newOrders.length} new order${newOrders.length > 1 ? "s" : ""}!`);
      }
      prevOrderIdsRef.current = new Set(fetched.map((o) => o.id));
      setOrders(fetched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("kitchen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifEnabled(result === "granted");
    toast[result === "granted" ? "success" : "error"](
      result === "granted" ? "Notifications enabled!" : "Permission denied"
    );
  };

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

  const tabs = [
    { key: "all", label: "All Active" },
    { key: "new", label: "🔔 New" },
    { key: "accepted", label: "👍 Accepted" },
    { key: "preparing", label: "🍳 Preparing" },
    { key: "ready", label: "✅ Ready" },
  ];

  const filteredOrders = activeTab === "all" ? orders : orders.filter(o => o.status === activeTab);

  return (
    <OwnerLayout>
      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Kitchen Display</h1>
            <p className="text-sm text-muted-foreground">{orders.length} active orders</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={notifEnabled ? "outline" : "default"}
              size="sm"
              onClick={notifEnabled ? undefined : requestNotifPermission}
              className="gap-1.5"
            >
              {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{notifEnabled ? "Notifications On" : "Enable Notifications"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const count = tab.key === "all" ? orders.length : orders.filter(o => o.status === tab.key).length;
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className="whitespace-nowrap"
              >
                {tab.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">{count}</Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No orders in this queue</p>
          <p className="text-sm mt-2">Orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-card rounded-xl border-2 p-4 shadow-card ${urgencyClass(order.created_at)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-bold text-foreground">
                    Table {order.table_number}
                  </span>
                  <Badge className={statusColors[order.status] || ""}>
                    {order.status}
                  </Badge>
                </div>
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

export default KitchenDisplay;
