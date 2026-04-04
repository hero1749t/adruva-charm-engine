import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/hooks/useStaffRole";
import { PaymentMethod, useCashierMenuData, useCashierOrders } from "@/hooks/useCashierOrders";
import OwnerLayout from "@/components/OwnerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ban, CheckCircle2, IndianRupee, Plus, Printer, Receipt, RotateCcw, Search, SplitSquareVertical } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import PrinterSetup, { generateReceiptHTML, printReceipt } from "@/components/billing/PrinterSetup";
import { Textarea } from "@/components/ui/textarea";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type PaymentEntry = Database["public"]["Tables"]["order_payment_entries"]["Row"];
type OrderWithItems = OrderRow & { order_items: OrderItem[]; order_payment_entries: PaymentEntry[] };
type BillingCorrectionAction = "reopen" | "void";

const paymentMethods: PaymentMethod[] = ["cash", "upi", "card"];

const statusBadgeClass: Record<string, string> = {
  ready: "bg-success/10 text-success border-success/20",
  served: "bg-muted text-muted-foreground border-border",
  new: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-warning/10 text-warning border-warning/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const paymentBadgeClass: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  partial: "bg-primary/10 text-primary border-primary/20",
  confirmed: "bg-success/10 text-success border-success/20",
  reverted: "bg-destructive/10 text-destructive border-destructive/20",
  voided: "bg-destructive/10 text-destructive border-destructive/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getPaidAmount = (order: OrderWithItems) =>
  (order.order_payment_entries ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0);

const getRemainingAmount = (order: OrderWithItems) => Math.max(Number(order.total_amount) - getPaidAmount(order), 0);

const CashierDashboard = () => {
  const { ownerId, loading: roleLoading, isOwner, isManager } = useStaffRole();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"billing" | "active" | "all">("billing");
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<{
    restaurant_name?: string | null;
    address?: string | null;
    phone?: string | null;
    gst_number?: string | null;
    gst_percentage?: number | null;
  }>({});
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("auto_print_on_served") === "true");
  const [correctionDraft, setCorrectionDraft] = useState<{ orderId: string; action: BillingCorrectionAction } | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [manualTableId, setManualTableId] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualMenuSearch, setManualMenuSearch] = useState("");
  const [manualItemQuantities, setManualItemQuantities] = useState<Record<string, number>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { method: PaymentMethod; note: string }>>({});
  const {
    orders,
    isLoading: ordersLoading,
    refetchOrders,
    createManualOrderMutation,
    recordManualPaymentMutation,
    reopenBillMutation,
    voidBillMutation,
  } = useCashierOrders(ownerId, filter);
  const { freeTables, categories, items, isLoading: menuLoading } = useCashierMenuData(ownerId);

  useEffect(() => {
    if (!ownerId) {
      setProfile({});
      return;
    }

    let ignore = false;

    const loadProfile = async () => {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("restaurant_name, address, phone, gst_number, gst_percentage")
        .eq("user_id", ownerId)
        .maybeSingle();

      if (ignore) return;
      if (error) {
        toast.error("Failed to load restaurant billing profile");
        return;
      }

      setProfile(profileData ?? {});
    };

    void loadProfile();
    return () => {
      ignore = true;
    };
  }, [ownerId]);

  const fetchOrderForReceipt = useCallback(async (orderId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*), order_payment_entries(*)")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load final bill");
      return null;
    }

    return data as OrderWithItems | null;
  }, []);

  const handlePrintReceipt = useCallback(
    (order: OrderWithItems) => {
      const paymentSummary =
        order.payment_method === "split"
          ? order.order_payment_entries
              .map((entry) => `${entry.payment_method.toUpperCase()} ${formatCurrency(Number(entry.amount))}`)
              .join(" | ")
          : order.payment_method?.toUpperCase() ?? null;

      const html = generateReceiptHTML({
        restaurantName: profile.restaurant_name || "Restaurant",
        address: profile.address,
        phone: profile.phone,
        gstNumber: profile.gst_number,
        orderId: order.id,
        billNumber: order.bill_number,
        tableNumber: order.table_number || 0,
        items: order.order_items.map((item) => ({
          name: item.item_name,
          quantity: item.quantity,
          price: item.item_price,
        })),
        total: Number(order.total_amount),
        gstPercentage: profile.gst_percentage ?? 5,
        paymentMethod: paymentSummary,
        createdAt: new Date(order.created_at).toLocaleString("en-IN"),
      });

      printReceipt(html);
    },
    [profile.address, profile.gst_number, profile.gst_percentage, profile.phone, profile.restaurant_name],
  );

  const toggleAutoPrint = (checked: boolean) => {
    setAutoPrint(checked);
    localStorage.setItem("auto_print_on_served", String(checked));
    toast.success(checked ? "Auto-print ON - final bill will print after closure" : "Auto-print OFF");
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const visibleOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const itemMatch = order.order_items.some((item) => item.item_name.toLowerCase().includes(needle));
      return (
        String(order.table_number ?? "").includes(needle) ||
        order.order_origin.toLowerCase().includes(needle) ||
        order.status.toLowerCase().includes(needle) ||
        order.payment_status.toLowerCase().includes(needle) ||
        itemMatch
      );
    });
  }, [orders, search]);

  const summary = useMemo(() => {
    const todayStart = startOfToday().getTime();
    const qrSettledCount = orders.filter((order) => order.order_origin === "qr" && order.payment_status === "confirmed").length;
    const pendingCounterCount = orders.filter(
      (order) => order.order_origin === "counter" && !["confirmed", "voided"].includes(order.payment_status) && order.status !== "cancelled",
    ).length;
    const todayCollection = orders
      .filter((order) => {
        if (order.payment_status !== "confirmed" || !order.payment_confirmed_at) return false;
        return new Date(order.payment_confirmed_at).getTime() >= todayStart;
      })
      .reduce((sum, order) => sum + Number(order.total_amount), 0);

    return {
      qrSettledCount,
      pendingCounterCount,
      todayCollection,
      freeTables: freeTables.length,
    };
  }, [freeTables.length, orders]);

  const categorizedItems = useMemo(() => {
    const needle = manualMenuSearch.trim().toLowerCase();
    const filteredItems = items.filter((item) => !needle || item.name.toLowerCase().includes(needle));
    return categories
      .map((category) => ({
        ...category,
        items: filteredItems.filter((item) => item.category_id === category.id),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, items, manualMenuSearch]);

  const manualOrderLines = useMemo(
    () =>
      Object.entries(manualItemQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = items.find((entry) => entry.id === itemId);
          return item ? { item, quantity: qty } : null;
        })
        .filter(Boolean) as { item: (typeof items)[number]; quantity: number }[],
    [items, manualItemQuantities],
  );

  const manualOrderTotal = useMemo(
    () => manualOrderLines.reduce((sum, line) => sum + Number(line.item.price) * line.quantity, 0),
    [manualOrderLines],
  );

  const openCorrectionDialog = (orderId: string, action: BillingCorrectionAction) => {
    setCorrectionDraft({ orderId, action });
    setCorrectionReason(action === "reopen" ? "Wrong billing flow selected" : "Order billed by mistake");
  };

  const runBillingCorrection = async (orderId: string, action: BillingCorrectionAction, reason: string) => {
    setActionOrderId(orderId);
    try {
      if (action === "reopen") {
        await reopenBillMutation.mutateAsync({ orderId, reason });
        toast.success("Bill reopened and moved back to ready queue");
      } else {
        await voidBillMutation.mutateAsync({ orderId, reason });
        toast.success("Bill voided and audit trail recorded");
      }
      await refetchOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Billing correction failed");
    } finally {
      setActionOrderId(null);
    }
  };

  const handleAddPayment = async (order: OrderWithItems) => {
    const draft = paymentDrafts[order.id] ?? { method: "cash", note: "" };
    const remaining = getRemainingAmount(order);
    const amount = remaining;
    const closesInvoice = true;
    const autoReference =
      draft.method === "cash"
        ? null
        : `${draft.method.toUpperCase()}-${order.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;

    if (!remaining || remaining <= 0) {
      toast.error("This invoice is already fully paid");
      return;
    }

    setActionOrderId(order.id);

    try {
      await recordManualPaymentMutation.mutateAsync({
        orderId: order.id,
        paymentMethod: draft.method,
        amount,
        paymentReference: autoReference,
        billingNote: draft.note,
      });

      toast.success(closesInvoice ? "Invoice closed and bill generated" : "Split payment recorded");
      setPaymentDrafts((prev) => ({
        ...prev,
        [order.id]: { method: draft.method, note: "" },
      }));

      await refetchOrders();

      if (autoPrint && closesInvoice) {
        const finalOrder = await fetchOrderForReceipt(order.id);
        if (finalOrder) {
          handlePrintReceipt(finalOrder);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setActionOrderId(null);
    }
  };

  const handleCreateManualOrder = async () => {
    if (!manualTableId) {
      toast.error("Select a free table first");
      return;
    }

    if (!manualOrderLines.length) {
      toast.error("Add at least one item to create a counter order");
      return;
    }

    try {
      await createManualOrderMutation.mutateAsync({
        tableId: manualTableId,
        customerPhone: manualCustomerPhone,
        notes: manualNotes,
        items: manualOrderLines.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
      });
      toast.success("Counter order created and table locked");
      setNewOrderOpen(false);
      setManualTableId("");
      setManualCustomerPhone("");
      setManualNotes("");
      setManualMenuSearch("");
      setManualItemQuantities({});
      setFilter("all");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create manual order");
    }
  };

  const tabs = [
    { key: "billing" as const, label: "Hybrid Billing" },
    { key: "active" as const, label: "Kitchen Active" },
    { key: "all" as const, label: "All Orders" },
  ];

  const canCorrectBilledOrders = isOwner || isManager;

  return (
    <OwnerLayout>
      {!ordersLoading && !ownerId ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">Billing access is not available</p>
          <p className="mt-2 text-sm">Your account is not linked to a restaurant owner yet.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5"><div className="mb-2 flex items-center justify-between"><span className="text-sm text-muted-foreground">Pending Counter</span><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Receipt className="h-4 w-4 text-primary" /></div></div><p className="font-display text-2xl font-bold text-foreground">{summary.pendingCounterCount}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><div className="mb-2 flex items-center justify-between"><span className="text-sm text-muted-foreground">QR Settled</span><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10"><CheckCircle2 className="h-4 w-4 text-success" /></div></div><p className="font-display text-2xl font-bold text-foreground">{summary.qrSettledCount}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><div className="mb-2 flex items-center justify-between"><span className="text-sm text-muted-foreground">Today's Collection</span><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10"><IndianRupee className="h-4 w-4 text-success" /></div></div><p className="font-display text-2xl font-bold text-foreground">{formatCurrency(summary.todayCollection)}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><div className="mb-2 flex items-center justify-between"><span className="text-sm text-muted-foreground">Free Tables</span><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10"><Plus className="h-4 w-4 text-success" /></div></div><p className="font-display text-2xl font-bold text-foreground">{summary.freeTables}</p></div>
          </div>

          <div className="mb-4">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Hybrid Billing Desk</h2>
                <p className="text-sm text-muted-foreground">Counter orders, QR-settled checks, split payments, and final thermal receipts from one real-time screen.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5"><span className="whitespace-nowrap text-xs text-muted-foreground">Auto Print</span><Switch checked={autoPrint} onCheckedChange={toggleAutoPrint} className="scale-90" /></div>
                <PrinterSetup />
                <Button onClick={() => setNewOrderOpen(true)}><Plus className="mr-1 h-4 w-4" />New Order</Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <Button key={tab.key} variant={filter === tab.key ? "default" : "outline"} size="sm" onClick={() => setFilter(tab.key)} className="whitespace-nowrap">{tab.label}</Button>
                ))}
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search table, items, origin, status" className="pl-9" />
              </div>
            </div>
          </div>

          {ordersLoading || roleLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-5"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-32 w-full" /></div>)}
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground"><p className="text-lg">No orders found</p><p className="mt-2 text-sm">Try another tab or search term.</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleOrders.map((order) => {
                const paidAmount = getPaidAmount(order);
                const remainingAmount = getRemainingAmount(order);
                const isClosed = order.payment_status === "confirmed";
                const isGatewayLocked = Boolean(order.payment_locked_at);
                const isBusy = actionOrderId === order.id || recordManualPaymentMutation.isPending;
                const paymentDraft = paymentDrafts[order.id] ?? { method: "cash" as PaymentMethod, note: "" };

                return (
                  <div key={order.id} className="rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-display text-lg font-bold text-foreground">Table {order.table_number}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge className={`border ${statusBadgeClass[order.status] || ""}`}>{order.status}</Badge>
                          <Badge className={`border ${paymentBadgeClass[order.payment_status] || ""}`}>{order.payment_status}</Badge>
                          <Badge variant="outline">{order.order_origin === "qr" ? "QR-Settled" : "Pending Counter"}</Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
                    </div>

                    <div className="mb-3 space-y-1">
                      {order.order_items.map((item) => <div key={item.id} className="flex justify-between text-sm"><span className="text-foreground">{item.quantity}x {item.item_name}</span><span className="text-muted-foreground">{formatCurrency(Number(item.item_price) * item.quantity)}</span></div>)}
                    </div>

                    <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                      <div className="grid grid-cols-3 gap-3">
                        <div><p className="text-xs text-muted-foreground">Order</p><p className="font-semibold text-foreground">{formatCurrency(Number(order.total_amount))}</p></div>
                        <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-success">{formatCurrency(paidAmount)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-semibold text-warning">{formatCurrency(remainingAmount)}</p></div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">{order.bill_number ? <span>Bill No: {order.bill_number}</span> : <span>Bill: Draft</span>}{isGatewayLocked ? <span>Locked: {order.payment_lock_reason}</span> : null}</div>
                    </div>

                    <div className="mb-3"><div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><SplitSquareVertical className="h-3.5 w-3.5" />Payment rows</div><div className="space-y-2">{order.order_payment_entries.length ? order.order_payment_entries.map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs"><div><p className="font-medium text-foreground">{entry.payment_method.toUpperCase()}</p><p className="text-muted-foreground">{entry.reference || entry.source}</p></div><span className="font-semibold text-foreground">{formatCurrency(Number(entry.amount))}</span></div>) : <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">No payments recorded yet</div>}</div></div>

                    <div className="mb-3 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={async () => { const finalOrder = isClosed ? order : await fetchOrderForReceipt(order.id); if (!finalOrder || finalOrder.payment_status !== "confirmed") { toast.error("Close the invoice before printing the final receipt"); return; } handlePrintReceipt(finalOrder); }} className="flex-1"><Printer className="mr-1 h-4 w-4" />Print Receipt</Button>
                      {isClosed ? canCorrectBilledOrders && !isGatewayLocked ? (<><Button size="sm" variant="outline" onClick={() => openCorrectionDialog(order.id, "reopen")} className="flex-1"><RotateCcw className="mr-1 h-4 w-4" />Reopen</Button><Button size="sm" variant="outline" onClick={() => openCorrectionDialog(order.id, "void")} className="flex-1 text-destructive hover:text-destructive"><Ban className="mr-1 h-4 w-4" />Void</Button></>) : <div className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">{isGatewayLocked ? "Gateway-settled invoice is locked" : "Manager approval required for corrections"}</div> : null}
                    </div>

                    {!isClosed ? (
                      <div className="space-y-3 border-t border-border pt-3">
                        {isGatewayLocked ? (
                          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">QR gateway payment already recorded. Manual billing is locked.</div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-2">{paymentMethods.map((method) => <Button key={method} size="sm" variant={paymentDraft.method === method ? "default" : "outline"} className="capitalize text-xs" onClick={() => setPaymentDrafts((prev) => ({ ...prev, [order.id]: { ...paymentDraft, method } }))}>{method === "upi" ? "UPI" : method}</Button>)}</div>
                            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Closing amount: <span className="font-semibold text-foreground">{formatCurrency(remainingAmount)}</span></div>
                            <Input value={paymentDraft.note} onChange={(event) => setPaymentDrafts((prev) => ({ ...prev, [order.id]: { ...paymentDraft, note: event.target.value } }))} placeholder="Payment note (optional)" />
                            <Button onClick={() => void handleAddPayment(order)} disabled={isBusy}>{isBusy ? "Saving..." : "Close Invoice"}</Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-border pt-3 text-sm text-muted-foreground"><p>Closed at {order.payment_confirmed_at ? new Date(order.payment_confirmed_at).toLocaleString("en-IN") : "--"}</p>{order.billing_revert_reason ? <p className="mt-1">Reopen note: {order.billing_revert_reason}</p> : null}{order.billing_void_reason ? <p className="mt-1">Void note: {order.billing_void_reason}</p> : null}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader><DialogTitle>Create Counter Order</DialogTitle><DialogDescription>Select a free table, pick menu items, and create a valid cashier order without leaving the desk.</DialogDescription></DialogHeader>
              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Free Table</label>
                    <div className="grid grid-cols-2 gap-2">
                      {menuLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />) : freeTables.length ? freeTables.map((table) => <Button key={table.id} variant={manualTableId === table.id ? "default" : "outline"} onClick={() => setManualTableId(table.id)}>Table {table.table_number}</Button>) : <p className="col-span-2 text-sm text-muted-foreground">No free tables available right now.</p>}
                    </div>
                  </div>
                  <Input value={manualCustomerPhone} onChange={(event) => setManualCustomerPhone(event.target.value)} placeholder="Customer phone (optional)" />
                  <Textarea value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} placeholder="Order note (optional)" rows={3} />
                  <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-sm font-medium text-foreground">Order Summary</p><div className="mt-3 space-y-2">{manualOrderLines.length ? manualOrderLines.map((line) => <div key={line.item.id} className="flex items-center justify-between text-sm"><span>{line.quantity}x {line.item.name}</span><span>{formatCurrency(Number(line.item.price) * line.quantity)}</span></div>) : <p className="text-sm text-muted-foreground">No menu items selected yet.</p>}</div><div className="mt-3 border-t border-border pt-3 text-sm font-semibold text-foreground">Total: {formatCurrency(manualOrderTotal)}</div></div>
                </div>
                <div className="space-y-4">
                  <Input value={manualMenuSearch} onChange={(event) => setManualMenuSearch(event.target.value)} placeholder="Search menu items" />
                  <div className="max-h-[460px] space-y-5 overflow-y-auto pr-1">
                    {categorizedItems.map((category) => (
                      <div key={category.id}>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">{category.name}</h3>
                        <div className="space-y-2">
                          {category.items.map((item) => {
                            const qty = manualItemQuantities[item.id] ?? 0;
                            return <div key={item.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2"><div><p className="font-medium text-foreground">{item.name}</p><p className="text-sm text-muted-foreground">{formatCurrency(Number(item.price))}</p></div><div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => setManualItemQuantities((prev) => ({ ...prev, [item.id]: Math.max((prev[item.id] ?? 0) - 1, 0) }))}>-</Button><span className="w-6 text-center text-sm font-medium">{qty}</span><Button size="sm" variant="outline" onClick={() => setManualItemQuantities((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))}>+</Button></div></div>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setNewOrderOpen(false)}>Cancel</Button><Button onClick={() => void handleCreateManualOrder()} disabled={createManualOrderMutation.isPending || !freeTables.length}>{createManualOrderMutation.isPending ? "Creating..." : "Create Order"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={Boolean(correctionDraft)} onOpenChange={(open) => !open && setCorrectionDraft(null)}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>{correctionDraft?.action === "reopen" ? "Reopen billed order?" : "Void billed order?"}</AlertDialogTitle><AlertDialogDescription>{correctionDraft?.action === "reopen" ? "This moves the bill back to ready state so it can be corrected again." : "This cancels the settled order and records wastage + credit-note audit trail."}</AlertDialogDescription></AlertDialogHeader>
              <Textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} rows={4} placeholder="Add a clear audit reason" />
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (correctionDraft) { void runBillingCorrection(correctionDraft.orderId, correctionDraft.action, correctionReason); } setCorrectionDraft(null); setCorrectionReason(""); }}>Confirm</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </OwnerLayout>
  );
};

export default CashierDashboard;
