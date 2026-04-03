import { Suspense, lazy, useMemo, useState } from "react";
import { AlertTriangle, CreditCard, LifeBuoy, Rocket, TrendingDown, TrendingUp, Trash2, Users } from "lucide-react";

import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminMetricCard,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminClients } from "@/hooks/useAdminClients";
import { useAdminBillingDiscrepancies, useAdminInvoices, useAdminWastageReport } from "@/hooks/useAdminPayments";
import { useAdminOnboardingClients } from "@/hooks/useAdminOperations";
import { useAdminNotifications, useAdminSupportTickets } from "@/hooks/useAdminOpsCenter";
import { useAdminSubscriptionPlans, useAdminSubscriptionQueue } from "@/hooks/useAdminSubscriptions";
import { formatCurrency } from "@/lib/adminSuperData";

const rangeConfig = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
} as const;

const chartColors = ["#f97316", "#fb923c", "#0f172a", "#38bdf8", "#22c55e", "#f43f5e"];
const AdminReportsCharts = lazy(() => import("@/components/admin/AdminReportsCharts"));

const getMonthKey = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" });
};

const createMonthWindow = (months: number) => {
  const now = new Date();
  const keys: string[] = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
};

const ReportsChartSkeleton = () => <Skeleton className="h-[320px] w-full rounded-2xl" />;

const AdminReports = () => {
  const [range, setRange] = useState<keyof typeof rangeConfig>("6m");

  const clientsQuery = useAdminClients();
  const invoicesQuery = useAdminInvoices();
  const discrepanciesQuery = useAdminBillingDiscrepancies();
  const wastageQuery = useAdminWastageReport();
  const subscriptionsQuery = useAdminSubscriptionQueue();
  const plansQuery = useAdminSubscriptionPlans();
  const onboardingQuery = useAdminOnboardingClients();
  const supportTicketsQuery = useAdminSupportTickets();
  const notificationsQuery = useAdminNotifications();

  const isLoading =
    clientsQuery.isLoading ||
    invoicesQuery.isLoading ||
    discrepanciesQuery.isLoading ||
    wastageQuery.isLoading ||
    subscriptionsQuery.isLoading ||
    plansQuery.isLoading ||
    onboardingQuery.isLoading ||
    supportTicketsQuery.isLoading ||
    notificationsQuery.isLoading;

  const hasError =
    clientsQuery.isError ||
    invoicesQuery.isError ||
    discrepanciesQuery.isError ||
    wastageQuery.isError ||
    subscriptionsQuery.isError ||
    plansQuery.isError ||
    onboardingQuery.isError ||
    supportTicketsQuery.isError ||
    notificationsQuery.isError;

  const errorMessage =
    (clientsQuery.error instanceof Error && clientsQuery.error.message) ||
    (invoicesQuery.error instanceof Error && invoicesQuery.error.message) ||
    (discrepanciesQuery.error instanceof Error && discrepanciesQuery.error.message) ||
    (wastageQuery.error instanceof Error && wastageQuery.error.message) ||
    (subscriptionsQuery.error instanceof Error && subscriptionsQuery.error.message) ||
    (plansQuery.error instanceof Error && plansQuery.error.message) ||
    (onboardingQuery.error instanceof Error && onboardingQuery.error.message) ||
    (supportTicketsQuery.error instanceof Error && supportTicketsQuery.error.message) ||
    (notificationsQuery.error instanceof Error && notificationsQuery.error.message) ||
    "Admin reports could not be loaded.";

  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const discrepancies = useMemo(() => discrepanciesQuery.data ?? [], [discrepanciesQuery.data]);
  const wastageEvents = useMemo(() => wastageQuery.data ?? [], [wastageQuery.data]);
  const subscriptions = useMemo(() => subscriptionsQuery.data ?? [], [subscriptionsQuery.data]);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const onboarding = useMemo(() => onboardingQuery.data ?? [], [onboardingQuery.data]);
  const tickets = useMemo(() => supportTicketsQuery.data ?? [], [supportTicketsQuery.data]);
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);

  const monthWindow = useMemo(() => createMonthWindow(rangeConfig[range]), [range]);

  const revenueTrend = useMemo(() => {
    const mapped = new Map(monthWindow.map((key) => [key, { month: getMonthLabel(key), billed: 0, paid: 0, failed: 0 }]));

    invoices.forEach((invoice) => {
      const key = getMonthKey(invoice.created_at);
      if (!key || !mapped.has(key)) return;
      const bucket = mapped.get(key)!;
      bucket.billed += invoice.total;
      if (invoice.status.toLowerCase() === "paid") {
        bucket.paid += invoice.total;
      }
      if (invoice.status.toLowerCase() === "failed") {
        bucket.failed += invoice.total;
      }
    });

    return Array.from(mapped.values());
  }, [invoices, monthWindow]);

  const subscriptionTrend = useMemo(() => {
    const mapped = new Map(monthWindow.map((key) => [key, { month: getMonthLabel(key), subscriptions: 0, renewals: 0 }]));

    subscriptions.forEach((subscription) => {
      const key = getMonthKey(subscription.created_at);
      if (!key || !mapped.has(key)) return;
      const bucket = mapped.get(key)!;
      bucket.subscriptions += 1;
      if (subscription.expires_at) {
        bucket.renewals += 1;
      }
    });

    return Array.from(mapped.values());
  }, [monthWindow, subscriptions]);

  const moduleCoverage = useMemo(
    () => [
      { name: "QR Ordering", usage: plans.reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Inventory", usage: plans.filter((plan) => plan.feature_inventory).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Analytics", usage: plans.filter((plan) => plan.feature_analytics).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Chain", usage: plans.filter((plan) => plan.feature_chain).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Kitchen", usage: plans.filter((plan) => plan.feature_kitchen_display).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Feedback", usage: plans.filter((plan) => plan.feature_customer_reviews).reduce((sum, plan) => sum + plan.total_clients, 0) },
    ],
    [plans],
  );

  const planDistribution = useMemo(
    () => plans.map((plan) => ({ name: plan.name, value: plan.total_clients })),
    [plans],
  );

  const ticketStatusMix = useMemo(
    () =>
      Object.entries(
        tickets.reduce<Record<string, number>>((accumulator, ticket) => {
          const key = ticket.status.replace("_", " ");
          accumulator[key] = (accumulator[key] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [tickets],
  );

  const onboardingMix = useMemo(
    () =>
      Object.entries(
        onboarding.reduce<Record<string, number>>((accumulator, record) => {
          accumulator[record.onboarding_status] = (accumulator[record.onboarding_status] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [onboarding],
  );

  const notificationMix = useMemo(
    () =>
      Object.entries(
        notifications.reduce<Record<string, number>>((accumulator, notification) => {
          const key = notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1);
          accumulator[key] = (accumulator[key] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [notifications],
  );

  const summary = useMemo(() => {
    const activeClients = clients.filter((client) => client.client_status === "Active").length;
    const totalClients = clients.length;
    const churnRisk = clients.filter((client) => ["At Risk", "Paused"].includes(client.client_status)).length;
    const failedPayments = invoices.filter((invoice) => invoice.status.toLowerCase() === "failed").length;
    const openTickets = tickets.filter((ticket) => ticket.status.toLowerCase() !== "resolved").length;
    const onboardingLag = onboarding.filter((record) => record.onboarding_status !== "Ready").length;
    const collectionOpen = invoices
      .filter((invoice) => ["pending", "failed"].includes(invoice.status.toLowerCase()))
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const wastageLoss = wastageEvents.reduce((sum, event) => sum + event.estimated_loss_amount, 0);
    const mrr = subscriptions.reduce((sum, subscription) => {
      const plan = plans.find((entry) => entry.id === subscription.plan_id);
      return ["active", "trial"].includes(subscription.subscription_status.toLowerCase()) ? sum + (plan?.price ?? 0) : sum;
    }, 0);

    return {
      totalClients,
      activeClients,
      churnRisk,
      failedPayments,
      openTickets,
      onboardingLag,
      collectionOpen,
      wastageLoss,
      mrr,
    };
  }, [clients, invoices, onboarding, plans, subscriptions, tickets, wastageEvents]);

  const onboardingFocus = useMemo(
    () => onboarding.filter((record) => record.onboarding_status !== "Ready").slice(0, 5),
    [onboarding],
  );

  const collectionsQueue = useMemo(
    () =>
      invoices
        .filter((invoice) => ["pending", "failed"].includes(invoice.status.toLowerCase()))
        .sort((left, right) => {
          const leftTime = left.due_date ? new Date(left.due_date).getTime() : 0;
          const rightTime = right.due_date ? new Date(right.due_date).getTime() : 0;
          return leftTime - rightTime;
        })
        .slice(0, 5),
    [invoices],
  );

  const recentWastage = useMemo(() => wastageEvents.slice(0, 6), [wastageEvents]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Reports & Analytics"
          description="Platform-wide commercial, onboarding, support, and module analytics derived from live admin operations data."
          action={
            <Select value={range} onValueChange={(value) => setRange(value as keyof typeof rangeConfig)}>
              <SelectTrigger className="w-[180px] rounded-2xl bg-white">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {isLoading ? (
          <AdminLoadingState />
        ) : hasError ? (
          <AdminTableEmptyState title="Could not load reports" description={errorMessage} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard title="Estimated MRR" value={formatCurrency(summary.mrr)} delta="Current live plan value" icon={TrendingUp} />
              <AdminMetricCard title="Active Clients" value={String(summary.activeClients)} delta={`${summary.totalClients} total clients`} icon={Users} />
              <AdminMetricCard title="Open Collections" value={formatCurrency(summary.collectionOpen)} delta={`${summary.failedPayments} failed payments`} icon={CreditCard} />
              <AdminMetricCard title="Wastage Exposure" value={formatCurrency(summary.wastageLoss)} delta={`${wastageEvents.length} logged cancellation events`} icon={Trash2} />
            </div>

            <Suspense
              fallback={
                <>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <ReportsChartSkeleton />
                    <ReportsChartSkeleton />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <ReportsChartSkeleton />
                    <ReportsChartSkeleton />
                    <ReportsChartSkeleton />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <ReportsChartSkeleton />
                    <ReportsChartSkeleton />
                  </div>
                </>
              }
            >
              <AdminReportsCharts
                revenueTrend={revenueTrend}
                subscriptionTrend={subscriptionTrend}
                planDistribution={planDistribution}
                ticketStatusMix={ticketStatusMix}
                notificationMix={notificationMix}
                moduleCoverage={moduleCoverage}
                onboardingMix={onboardingMix}
                chartColors={chartColors}
              />
            </Suspense>

            <div className="grid gap-6 xl:grid-cols-2">
              <AdminPanelCard title="Collections Risk Queue" description="Invoices that still need active recovery or payment confirmation.">
                <div className="space-y-3">
                  {collectionsQueue.length ? (
                    collectionsQueue.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{invoice.client_name}</p>
                          <p className="text-sm text-slate-500">
                            {invoice.invoice_number} - {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "No due date"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <AdminStatusBadge value={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.total)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminTableEmptyState title="Collections are under control" description="No pending or failed invoices are currently in the queue." />
                  )}
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Wastage Report" description="Immutable cancel and void events captured for ops review and accountability.">
                <div className="space-y-3">
                  {recentWastage.length ? (
                    recentWastage.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{event.client_name}</p>
                            <p className="text-sm text-slate-500">
                              Table {event.table_number ?? "-"} - {new Date(event.created_at).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-rose-600">{formatCurrency(event.estimated_loss_amount)}</p>
                            <p className="text-xs text-slate-500">{event.authorised_by}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-700">{event.cancellation_reason}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {event.invoice_number ? <AdminStatusBadge value={`Invoice ${event.invoice_number}`} /> : null}
                          {event.credit_note_number ? <AdminStatusBadge value={`Credit ${event.credit_note_number}`} /> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminTableEmptyState title="No wastage logged" description="Cancelled and voided orders will appear here automatically." />
                  )}
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Billing Discrepancies" description="Orders where recorded payments do not yet match the order value.">
                <div className="space-y-3">
                  {discrepancies.length ? (
                    discrepancies.slice(0, 6).map((entry) => (
                      <div key={entry.order_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{entry.client_name}</p>
                            <p className="text-sm text-slate-500">
                              Table {entry.table_number ?? "-"} - {entry.order_origin === "qr" ? "QR" : "Counter"} - {entry.order_status}
                            </p>
                          </div>
                          <AdminStatusBadge value={entry.payment_status} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Order</p>
                            <p className="font-semibold text-slate-900">{formatCurrency(entry.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Paid</p>
                            <p className="font-semibold text-slate-900">{formatCurrency(entry.paid_amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Remaining</p>
                            <p className="font-semibold text-amber-600">{formatCurrency(entry.remaining_amount)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminTableEmptyState title="No payment mismatches" description="All partially-paid orders are currently balanced or resolved." />
                  )}
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Onboarding Focus Accounts" description="Clients still needing activation help before go-live.">
                <div className="space-y-3">
                  {onboardingFocus.length ? (
                    onboardingFocus.map((record) => (
                      <div key={record.owner_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{record.client_name}</p>
                            <p className="text-sm text-slate-500">{record.owner_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <AdminStatusBadge value={record.onboarding_status} />
                            {record.progress < 50 ? <TrendingDown className="h-4 w-4 text-rose-500" /> : null}
                            {record.progress >= 50 ? <Rocket className="h-4 w-4 text-orange-500" /> : null}
                          </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${record.progress}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminTableEmptyState title="Onboarding queue is healthy" description="No accounts currently need extra onboarding intervention." />
                  )}
                </div>
              </AdminPanelCard>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <AdminPanelCard title="Churn Watch" description="Clients that need commercial rescue or retention attention.">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-slate-900">{summary.churnRisk}</p>
                    <p className="text-sm text-slate-500">At-risk or paused clients</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
              </AdminPanelCard>
              <AdminPanelCard title="Payment Failures" description="Invoices in failed state across the billing ledger.">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-slate-900">{summary.failedPayments}</p>
                    <p className="text-sm text-slate-500">Recovery required</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-rose-500" />
                </div>
              </AdminPanelCard>
              <AdminPanelCard title="Support Pressure" description="Current unresolved ticket load on the platform team.">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-slate-900">{summary.openTickets}</p>
                    <p className="text-sm text-slate-500">Unresolved tickets</p>
                  </div>
                  <LifeBuoy className="h-6 w-6 text-sky-500" />
                </div>
              </AdminPanelCard>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
