import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import OwnerLayout from "@/components/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { IndianRupee, Receipt, Printer } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import PrinterSetup, { generateReceiptHTML, printReceipt } from "@/components/billing/PrinterSetup";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderWithItems = Order & { order_items: OrderItem[] };

const statusBadgeClass: Record<string, string> = {
  ready: "bg-success/10 text-success border-success/20",
  served: "bg-muted text-muted-foreground border-border",
  new: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-warning/10 text-warning border-warning/20",
};

const CashierDashboard = () => {
  const { user } = useAuth();
  const { loading: roleLoading } = useStaffRole();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("billing");
  const [profile, setProfile] = useState<{ restaurant_name?: string | null; address?: string | null; phone?: string | null; gst_number?: string | null }>({});
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("auto_print_on_served") === "true");
  const prevOrdersRef = useRef<OrderWithItems[]>([]);

  const fetchOrders = async () => {
    if (!user) return;
    const { data: staffData } = await supabase
      .from("staff_members").select("restaurant_owner_id")
      .eq("user_id", user.id).eq("is_active", true).maybeSingle();
    const ownerId = staffData?.restaurant_owner_id || user.id;

    // Fetch profile for receipt info
    const { data: profileData } = await supabase.from("profiles").select("restaurant_name, address, phone, gst_number").eq("user_id", ownerId).maybeSingle();
    if (profileData) setProfile(profileData);

    let query = supabase.from("orders").select("*, order_items(*)")
      .eq("owner_id", ownerId).order("created_at", { ascending: false });
    if (filter === "billing") query = query.in("status", ["ready", "served"]);
    else if (filter === "active") query = query.in("status", ["new", "accepted", "preparing", "ready"]);
    const { data, error } = await query;
    if (error) toast.error("Failed to load orders");
    else setOrders((data as OrderWithItems[]) || []);
    setLoading(false);
  };

  const handlePrintReceipt = (order: OrderWithItems) => {
    const html = generateReceiptHTML({
      restaurantName: profile.restaurant_name || "Restaurant",
      address: profile.address,
      phone: profile.phone,
      gstNumber: profile.gst_number,
      orderId: order.id,
      tableNumber: order.table_number || 0,
      items: order.order_items.map(i => ({ name: i.item_name, quantity: i.quantity, price: i.item_price })),
      total: Number(order.total_amount),
      paymentMethod: order.payment_method,
      createdAt: new Date(order.created_at).toLocaleString("en-IN"),
    });
    printReceipt(html);
  };

  useEffect(() => { if (!roleLoading) { setLoading(true); fetchOrders(); } }, [user, filter, roleLoading]);

  useEffect(() => {
    if (!user) return;
    const setupRealtime = async () => {
      const { data: staffData } = await supabase.from("staff_members").select("restaurant_owner_id")
        .eq("user_id", user.id).eq("is_active", true).maybeSingle();
      const ownerId = staffData?.restaurant_owner_id || user.id;
      const channel = supabase.channel("cashier-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${ownerId}` }, () => fetchOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };
    setupRealtime();
  }, [user]);

  const toggleAutoPrint = (checked: boolean) => {
    setAutoPrint(checked);
    localStorage.setItem("auto_print_on_served", String(checked));
    toast.success(checked ? "Auto-print ON — receipt will print on served" : "Auto-print OFF");
  };

  const markServed = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const { error } = await supabase.from("orders").update({ status: "served" as Order["status"] }).eq("id", orderId);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Order marked as served");
      // Auto-print receipt
      if (autoPrint && order) {
        handlePrintReceipt(order);
      }
      fetchOrders();
    }
  };

  const updatePayment = async (orderId: string, method: string) => {
    const { error } = await supabase.from("orders").update({ payment_method: method }).eq("id", orderId);
    if (error) toast.error("Failed to update payment");
    else { toast.success(`Payment: ${method}`); fetchOrders(); }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const todayTotal = orders.filter((o) => o.status === "served" || o.status === "ready")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const tabs = [
    { key: "billing", label: "Ready / Served" },
    { key: "active", label: "All Active" },
    { key: "all", label: "All Orders" },
  ];

  return (
    <OwnerLayout>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Orders to Bill</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{orders.filter((o) => o.status === "ready").length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Today's Collection</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">₹{todayTotal.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Tabs + Printer Setup */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold text-foreground">Billing & Orders</h2>
          <PrinterSetup />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <Button key={tab.key} variant={filter === tab.key ? "default" : "outline"} size="sm"
              onClick={() => setFilter(tab.key)} className="whitespace-nowrap">{tab.label}</Button>
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
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePrintReceipt(order)} title="Print Receipt">
                    <Printer className="w-4 h-4" />
                  </Button>
                  {order.status === "ready" && (
                    <Button size="sm" onClick={() => markServed(order.id)}>Mark Served</Button>
                  )}
                </div>
              </div>
              {(order.status === "ready" || order.status === "served") && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  {["cash", "upi", "card"].map((method) => (
                    <Button key={method} size="sm" variant={order.payment_method === method ? "default" : "outline"}
                      className="flex-1 capitalize text-xs" onClick={() => updatePayment(order.id, method)}>
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
