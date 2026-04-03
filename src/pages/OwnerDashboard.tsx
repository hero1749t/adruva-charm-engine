import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";
import { useLanguage } from "@/contexts/LanguageContext";
import OwnerLayout from "@/components/OwnerLayout";
import DashboardStats from "@/components/DashboardStats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Ban } from "lucide-react";
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
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
};

const OwnerDashboard = () => {
  const { ownerId, isOwner, isManager, loading: roleLoading } = useStaffRole();
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelDraft, setCancelDraft] = useState<OrderWithItems | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const statusTabs = [
    { key: "active", label: t("dashboard.tab.active") },
    { key: "new", label: t("dashboard.tab.new") },
    { key: "accepted", label: t("dashboard.tab.accepted") },
    { key: "preparing", label: t("dashboard.tab.preparing") },
    { key: "ready", label: t("dashboard.tab.ready") },
    { key: "all", label: t("dashboard.tab.all") },
  ];

  const fetchOrders = useCallback(async () => {
    if (!ownerId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (filter === "active") query = query.in("status", ["new", "accepted", "preparing", "ready"]);
    else if (filter !== "all") query = query.eq("status", filter as Order["status"]);

    const { data, error } = await query;
    if (error) {
      toast.error(language === "hi" ? "ऑर्डर्स लोड नहीं हो पाए" : "Failed to load orders");
    } else {
      setOrders((data as OrderWithItems[]) || []);
    }
    setLoading(false);
  }, [filter, language, ownerId]);

  useEffect(() => {
    if (roleLoading) return;
    setLoading(true);
    void fetchOrders();
  }, [fetchOrders, roleLoading]);

  useEffect(() => {
    if (roleLoading || !ownerId) return;
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${ownerId}` }, () => fetchOrders())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, ownerId, roleLoading]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as Order["status"] })
      .eq("id", orderId);

    if (error) {
      toast.error(language === "hi" ? "ऑर्डर स्टेटस अपडेट नहीं हुआ" : "Failed to update status");
    } else {
      toast.success(`${t("dashboard.mark")} ${t(`dashboard.status.${newStatus}`, newStatus)}`);
      void fetchOrders();
    }
  };

  const cancelOrder = async () => {
    if (!cancelDraft) return;

    const reason = cancelReason.trim();
    if (reason.length < 4) {
      toast.error("Add a clear cancellation reason");
      return;
    }

    setActionOrderId(cancelDraft.id);

    const { error } = await supabase.rpc("cancel_order_with_reason", {
      _order_id: cancelDraft.id,
      _reason: reason,
    });

    if (error) {
      toast.error(error.message || "Could not cancel order");
    } else {
      toast.success("Order cancelled with audit trail");
      setCancelDraft(null);
      setCancelReason("");
      await fetchOrders();
    }

    setActionOrderId(null);
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return t("dashboard.justNow");
    if (mins < 60) return `${mins}${t("dashboard.minutesAgo")}`;
    return `${Math.floor(mins / 60)}${t("dashboard.hoursAgo")} ${mins % 60}${t("dashboard.minutesAgo")}`;
  };

  return (
    <OwnerLayout>
      {(isOwner || isManager) && <DashboardStats />}

      <div className="mb-4">
        <h2 className="mb-3 font-display text-xl font-bold text-foreground">{t("dashboard.title")}</h2>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
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

      {!loading && !ownerId ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
          <p className="text-lg text-foreground">{t("dashboard.ordersUnavailable")}</p>
          <p className="mt-2 text-sm">{t("dashboard.ordersUnavailableHint")}</p>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
          <p className="text-lg">{t("dashboard.noOrders")}</p>
          <p className="mt-2 text-sm">{t("dashboard.noOrdersHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">
                    {t("dashboard.table")} {order.table_number}
                  </span>
                  <Badge className={`border ${statusBadgeClass[order.status] || ""}`}>
                    {t(`dashboard.status.${order.status}`, order.status)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
              </div>
              <div className="mb-4 space-y-1">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.quantity}x {item.item_name}
                    </span>
                    <span className="text-muted-foreground">₹{item.item_price}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-display text-lg font-bold">₹{order.total_amount}</span>
                <div className="flex items-center gap-2">
                  {(isOwner || isManager) && !["served", "cancelled"].includes(order.status) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={actionOrderId === order.id}
                      onClick={() => {
                        setCancelDraft(order);
                        setCancelReason("Customer cancelled before settlement");
                      }}
                    >
                      <Ban className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                  ) : null}
                  {statusFlow[order.status] ? (
                    <Button size="sm" disabled={actionOrderId === order.id} onClick={() => updateStatus(order.id, statusFlow[order.status])}>
                      {t("dashboard.mark")} {t(`dashboard.status.${statusFlow[order.status]}`, statusFlow[order.status])}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={Boolean(cancelDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelDraft(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel order?</DialogTitle>
            <DialogDescription>
              The order will remain immutable. Reason, authorised staff, and wastage audit trail will be saved.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={4}
            placeholder="Example: Customer left before food was served"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDraft(null);
                setCancelReason("");
              }}
            >
              Dismiss
            </Button>
            <Button variant="destructive" disabled={!cancelDraft || cancelReason.trim().length < 4} onClick={cancelOrder}>
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerDashboard;
