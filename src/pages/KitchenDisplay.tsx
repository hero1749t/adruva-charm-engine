import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";
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

const statusFlow: Record<string, string> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
};

const columnConfig = [
  { key: "new", label: "🔔 New", color: "border-primary", bgHeader: "bg-primary/10 text-primary" },
  { key: "accepted", label: "👍 Accepted", color: "border-blue-500", bgHeader: "bg-blue-500/10 text-blue-600" },
  { key: "preparing", label: "🍳 Preparing", color: "border-warning", bgHeader: "bg-warning/10 text-warning" },
  { key: "ready", label: "✅ Ready", color: "border-success", bgHeader: "bg-success/10 text-success" },
];

const playNotificationSound = () => {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
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
  } catch {
    // Ignore audio errors on unsupported browsers/devices.
  }
};

const sendBrowserNotification = (order: { table_number: number | null; order_items: OrderItem[] }) => {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const items = order.order_items.map((i) => `${i.quantity}× ${i.item_name}`).join(", ");
  new Notification(`🔔 New Order — Table ${order.table_number || "?"}`, {
    body: items || "New order received", icon: "/favicon.ico", tag: "new-order",
  });
};

const KitchenDisplay = () => {
  const { ownerId, loading: roleLoading } = useStaffRole();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!ownerId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders").select("*, order_items(*)")
      .eq("owner_id", ownerId)
      .in("status", ["new", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load kitchen orders");
      setOrders([]);
      setLoading(false);
      return;
    }
    if (data) {
      const fetched = data as OrderWithItems[];
      const newOrders = fetched.filter((o) => o.status === "new" && !prevOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        playNotificationSound();
        newOrders.forEach((o) => sendBrowserNotification(o));
        toast.success(`🔔 ${newOrders.length} new order${newOrders.length > 1 ? "s" : ""}!`);
      }
      prevOrderIdsRef.current = new Set(fetched.map((o) => o.id));
      setOrders(fetched);
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    if (roleLoading) return;
    setLoading(true);
    void fetchOrders();
  }, [fetchOrders, roleLoading]);

  useEffect(() => {
    if (roleLoading || !ownerId) return;
    const channel = supabase.channel("kitchen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${ownerId}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ownerId, fetchOrders, roleLoading]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifEnabled(result === "granted");
    toast[result === "granted" ? "success" : "error"](result === "granted" ? "Notifications enabled!" : "Permission denied");
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

  const urgencyBorder = (date: string) => {
    const mins = Math.floor((now - new Date(date).getTime()) / 60000);
    if (mins >= 15) return "ring-2 ring-destructive/40";
    if (mins >= 8) return "ring-2 ring-warning/40";
    return "";
  };

  return (
    <OwnerLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Kitchen Display</h1>
          <p className="text-sm text-muted-foreground">{orders.length} active orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={notifEnabled ? "outline" : "default"} size="sm"
            onClick={notifEnabled ? undefined : requestNotifPermission} className="gap-1.5">
            {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{notifEnabled ? "On" : "Enable"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-6 w-20" /><Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : !ownerId ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">Kitchen access is not available</p>
          <p className="mt-2 text-sm">Your account is not linked to a restaurant owner yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop: 4-column Kanban layout */}
          <div className="hidden md:grid grid-cols-4 gap-4">
            {columnConfig.map((col) => {
              const colOrders = orders.filter(o => o.status === col.key);
              return (
                <div key={col.key} className="flex flex-col">
                  <div className={`rounded-lg px-3 py-2 mb-3 text-sm font-semibold flex items-center justify-between ${col.bgHeader}`}>
                    <span>{col.label}</span>
                    <Badge variant="secondary" className="text-xs">{colOrders.length}</Badge>
                  </div>
                  <div className="space-y-3 flex-1">
                    {colOrders.map((order) => (
                      <div key={order.id} className={`bg-card rounded-xl border border-border p-4 shadow-card ${urgencyBorder(order.created_at)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display text-lg font-bold text-foreground">T-{order.table_number}</span>
                          <span className={`text-xs font-bold ${
                            parseInt(minsAgo(order.created_at)) >= 15 ? "text-destructive" :
                            parseInt(minsAgo(order.created_at)) >= 8 ? "text-warning" : "text-muted-foreground"
                          }`}>{minsAgo(order.created_at)}</span>
                        </div>
                        <div className="space-y-1 mb-3">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex gap-2 text-sm">
                              <span className="font-bold text-foreground">{item.quantity}×</span>
                              <span className="text-foreground">{item.item_name}</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <p className="text-xs text-muted-foreground bg-accent rounded-lg p-2 mb-3 italic">📝 {order.notes}</p>
                        )}
                        {statusFlow[order.status] && (
                          <Button size="sm" className="w-full" onClick={() => updateStatus(order.id, statusFlow[order.status])}>
                            Mark {statusFlow[order.status]}
                          </Button>
                        )}
                      </div>
                    ))}
                    {colOrders.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-xs">No orders</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: Stacked cards with status badges */}
          <div className="md:hidden space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>No active orders</p>
              </div>
            ) : orders.map((order) => {
              const colCfg = columnConfig.find(c => c.key === order.status);
              return (
                <div key={order.id} className={`bg-card rounded-xl border border-border p-4 shadow-card ${urgencyBorder(order.created_at)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold">T-{order.table_number}</span>
                      <Badge className={colCfg?.bgHeader || ""}>{order.status}</Badge>
                    </div>
                    <span className={`text-xs font-bold ${
                      parseInt(minsAgo(order.created_at)) >= 15 ? "text-destructive" :
                      parseInt(minsAgo(order.created_at)) >= 8 ? "text-warning" : "text-muted-foreground"
                    }`}>{minsAgo(order.created_at)}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex gap-2 text-sm">
                        <span className="font-bold">{item.quantity}×</span>
                        <span>{item.item_name}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-xs text-muted-foreground bg-accent rounded-lg p-2 mb-3 italic">📝 {order.notes}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-display font-bold">₹{order.total_amount}</span>
                    {statusFlow[order.status] && (
                      <Button size="sm" onClick={() => updateStatus(order.id, statusFlow[order.status])}>
                        Mark {statusFlow[order.status]}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </OwnerLayout>
  );
};

export default KitchenDisplay;
