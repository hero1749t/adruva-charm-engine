import { useMemo, useState } from "react";
import { CalendarClock, CreditCard, Filter, PencilLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminSubscriptionPlans,
  useAdminSubscriptionQueue,
  useAssignAdminClientPlan,
  type AdminSubscriptionPlan,
  type AdminSubscriptionQueueRow,
} from "@/hooks/useAdminSubscriptions";
import { formatCurrency } from "@/lib/adminSuperData";

const statusOptions = ["active", "trial", "paused", "expired"] as const;

const featureLabels: Array<{
  key: keyof Pick<
    AdminSubscriptionPlan,
    | "feature_inventory"
    | "feature_analytics"
    | "feature_chain"
    | "feature_coupons"
    | "feature_online_orders"
    | "feature_kitchen_display"
    | "feature_customer_reviews"
    | "feature_white_label"
  >;
  label: string;
}> = [
  { key: "feature_inventory", label: "Inventory" },
  { key: "feature_analytics", label: "Analytics" },
  { key: "feature_chain", label: "Multi Outlet" },
  { key: "feature_coupons", label: "Coupons" },
  { key: "feature_online_orders", label: "Online Orders" },
  { key: "feature_kitchen_display", label: "Kitchen Display" },
  { key: "feature_customer_reviews", label: "Feedback" },
  { key: "feature_white_label", label: "White Label" },
];

type AssignmentDraft = {
  ownerId: string;
  clientName: string;
  currentPlanName: string;
  planId: string;
  status: string;
  expiresAt: string;
  notes: string;
};

const formatRenewalLabel = (value: string | null) => {
  if (!value) return "No renewal date";

  return format(new Date(value), "dd MMM yyyy");
};

const summarizePlanFeatures = (plan: AdminSubscriptionPlan) => {
  const enabled = featureLabels.filter((feature) => plan[feature.key]).map((feature) => feature.label);
  return enabled.length ? enabled.slice(0, 4).join(" | ") : "Base access only";
};

const AdminPlans = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignment, setAssignment] = useState<AssignmentDraft | null>(null);

  const { data: plans = [], isLoading: plansLoading, isError: plansError, error: plansErrorValue } = useAdminSubscriptionPlans();
  const { data: queue = [], isLoading: queueLoading, isError: queueError, error: queueErrorValue } = useAdminSubscriptionQueue();
  const assignPlan = useAssignAdminClientPlan();

  const filteredQueue = useMemo(
    () =>
      queue.filter((row) => {
        const haystack = [row.client_name, row.owner_name, row.contact, row.phone ?? "", row.plan_name].join(" ").toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const normalizedStatus = row.subscription_status.toLowerCase();
        const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [queue, query, statusFilter],
  );

  const expiringSoon = useMemo(
    () =>
      queue.filter((row) => {
        if (!row.expires_at) return false;
        const expiry = new Date(row.expires_at).getTime();
        const today = new Date();
        const inSevenDays = new Date();
        inSevenDays.setDate(today.getDate() + 7);
        return expiry >= today.getTime() && expiry <= inSevenDays.getTime();
      }).length,
    [queue],
  );

  const openAssignmentDialog = (row: AdminSubscriptionQueueRow) => {
    setAssignment({
      ownerId: row.owner_id,
      clientName: row.client_name,
      currentPlanName: row.plan_name,
      planId: row.plan_id,
      status: row.subscription_status.toLowerCase(),
      expiresAt: row.expires_at ? row.expires_at.slice(0, 10) : "",
      notes: row.notes ?? "",
    });
  };

  const selectedPlan = plans.find((plan) => plan.id === assignment?.planId) ?? null;

  const handleAssignPlan = async () => {
    if (!assignment) return;
    if (!assignment.planId) {
      toast.error("Select a plan first");
      return;
    }

    try {
      await assignPlan.mutateAsync({
        ownerId: assignment.ownerId,
        planId: assignment.planId,
        status: assignment.status,
        expiresAt: assignment.expiresAt || null,
        notes: assignment.notes,
      });

      toast.success("Client subscription updated");
      setAssignment(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
    }
  };

  const isLoading = plansLoading || queueLoading;
  const hasError = plansError || queueError;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Subscriptions & Plans"
          description="Manage live plan catalog, assignment, upgrades, billing cycle, add-ons, coupons, and renewal health across clients."
          action={<AdminStatusBadge value="Live" />}
        />

        {isLoading ? (
          <AdminLoadingState />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-4">
              {plans.map((plan) => (
                <AdminPanelCard
                  key={plan.id}
                  title={plan.name}
                  description={`${plan.total_clients} clients | ${plan.active_clients} active`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-3xl font-semibold text-slate-900">{formatCurrency(plan.price)}</p>
                        <p className="mt-1 text-sm text-slate-500 capitalize">{plan.billing_period ?? "custom"} billing</p>
                      </div>
                      <AdminStatusBadge value={plan.is_active ? "Live" : "Paused"} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <p className="text-slate-500">Tables</p>
                        <p className="font-medium text-slate-900">{plan.max_tables ?? "—"}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <p className="text-slate-500">Staff</p>
                        <p className="font-medium text-slate-900">{plan.max_staff ?? "—"}</p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500">{summarizePlanFeatures(plan)}</p>
                  </div>
                </AdminPanelCard>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AdminPanelCard title="Renewal Health" description="Expiring, trial, and paused subscription visibility.">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600"><CalendarClock className="h-4 w-4" /> Expiring soon</span>
                    <span className="font-semibold text-slate-900">{expiringSoon}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600"><Sparkles className="h-4 w-4" /> Trial clients</span>
                    <span className="font-semibold text-slate-900">{queue.filter((row) => row.subscription_status.toLowerCase() === "trial").length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600"><ShieldCheck className="h-4 w-4" /> Active subscriptions</span>
                    <span className="font-semibold text-slate-900">{queue.filter((row) => row.subscription_status.toLowerCase() === "active").length}</span>
                  </div>
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Billing Mix" description="Current billing-period and status composition.">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600"><CreditCard className="h-4 w-4" /> Monthly plans</span>
                    <span className="font-semibold text-slate-900">{queue.filter((row) => row.billing_period === "monthly").length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600"><CreditCard className="h-4 w-4" /> Custom billing</span>
                    <span className="font-semibold text-slate-900">{queue.filter((row) => row.billing_period !== "monthly").length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600"><Filter className="h-4 w-4" /> Paused or expired</span>
                    <span className="font-semibold text-slate-900">
                      {queue.filter((row) => ["paused", "expired"].includes(row.subscription_status.toLowerCase())).length}
                    </span>
                  </div>
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Phase 2 Scope" description="Safe actions live in this phase.">
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="rounded-2xl bg-slate-50 px-4 py-3">Real plan catalog from `subscription_plans`</p>
                  <p className="rounded-2xl bg-slate-50 px-4 py-3">Real client subscription queue from `owner_subscriptions`</p>
                  <p className="rounded-2xl bg-slate-50 px-4 py-3">Admin plan reassignment, renewal update, and internal notes</p>
                </div>
              </AdminPanelCard>
            </div>

            <AdminPanelCard title="Plan Assignment Queue" description="Live upgrade, downgrade, renewal, and account subscription operations.">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by client, owner, email, phone, or plan"
                    className="rounded-2xl pl-10"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] rounded-2xl">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasError ? (
                <AdminTableEmptyState
                  title="Could not load subscription data"
                  description={
                    plansErrorValue instanceof Error
                      ? plansErrorValue.message
                      : queueErrorValue instanceof Error
                        ? queueErrorValue.message
                        : "Admin subscription data could not be loaded."
                  }
                />
              ) : filteredQueue.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Current Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Outlets</TableHead>
                        <TableHead>Renewal</TableHead>
                        <TableHead>Billing Cycle</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQueue.map((row) => (
                        <TableRow key={row.subscription_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{row.client_name}</p>
                              <p className="text-xs text-slate-500">{row.owner_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-700">
                              <p>{row.contact}</p>
                              {row.phone ? <p className="text-xs text-slate-500">{row.phone}</p> : null}
                            </div>
                          </TableCell>
                          <TableCell>{row.plan_name}</TableCell>
                          <TableCell><AdminStatusBadge value={row.subscription_status.charAt(0).toUpperCase() + row.subscription_status.slice(1)} /></TableCell>
                          <TableCell>{row.outlets_count}</TableCell>
                          <TableCell>{formatRenewalLabel(row.expires_at)}</TableCell>
                          <TableCell className="capitalize">{row.billing_period ?? "custom"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => openAssignmentDialog(row)}>
                              <PencilLine className="mr-2 h-4 w-4" />
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <AdminTableEmptyState title="No subscriptions match this filter" description="Try a different status or clear the search query." />
              )}
            </AdminPanelCard>
          </>
        )}
      </div>

      <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && setAssignment(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage client subscription</DialogTitle>
            <DialogDescription>
              Update plan, renewal date, and current subscription status without leaving the queue.
            </DialogDescription>
          </DialogHeader>

          {assignment ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{assignment.clientName}</p>
                <p className="text-sm text-slate-500">Current plan: {assignment.currentPlanName}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plan</label>
                  <Select value={assignment.planId} onValueChange={(value) => setAssignment((current) => current ? { ...current, planId: value } : current)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} | {formatCurrency(plan.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select value={assignment.status} onValueChange={(value) => setAssignment((current) => current ? { ...current, status: value } : current)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Renewal date</label>
                  <Input
                    type="date"
                    className="rounded-2xl"
                    value={assignment.expiresAt}
                    onChange={(event) => setAssignment((current) => current ? { ...current, expiresAt: event.target.value } : current)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Billing summary</label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {selectedPlan ? (
                      <>
                        <p className="font-medium text-slate-900">{selectedPlan.name}</p>
                        <p>{formatCurrency(selectedPlan.price)} | {selectedPlan.billing_period ?? "custom"} cycle</p>
                        <p className="mt-1">{summarizePlanFeatures(selectedPlan)}</p>
                      </>
                    ) : (
                      <p>Select a plan to preview features and price.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Internal notes</label>
                <Textarea
                  value={assignment.notes}
                  onChange={(event) => setAssignment((current) => current ? { ...current, notes: event.target.value } : current)}
                  className="min-h-[120px] rounded-2xl"
                  placeholder="Mention renewal context, coupon, add-on, finance approval, or migration notes."
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setAssignment(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={handleAssignPlan} disabled={assignPlan.isPending}>
              {assignPlan.isPending ? "Saving..." : "Save subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPlans;
