import { Suspense, lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Building2,
  CreditCard,
  LifeBuoy,
  ReceiptText,
  Rocket,
  TrendingUp,
  Users,
} from "lucide-react";

import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminMetricCard,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminClients } from "@/hooks/useAdminClients";
import { useAdminInvoices } from "@/hooks/useAdminPayments";
import { useAdminDemoRequests, useAdminOnboardingClients, useAdminOutletsDirectory } from "@/hooks/useAdminOperations";
import { useAdminNotifications, useAdminSupportTickets } from "@/hooks/useAdminOpsCenter";
import { useAdminSubscriptionPlans, useAdminSubscriptionQueue } from "@/hooks/useAdminSubscriptions";
import { formatCurrency } from "@/lib/adminSuperData";

const chartColors = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5"];
const AdminDashboardCharts = lazy(() => import("@/components/admin/AdminDashboardCharts"));

const isExpiringSoon = (value: string | null) => {
  if (!value) return false;
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const expiry = new Date(value);
  return expiry >= now && expiry <= nextWeek;
};

const formatLeadStatus = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const PanelListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => <Skeleton className="h-[260px] w-full rounded-2xl" />;

const AdminDashboard = () => {
  const [range, setRange] = useState("current");

  const { data: clients = [], isLoading: clientsLoading, isError: clientsError, error: clientsErrorValue } = useAdminClients();
  const { data: plans = [], isLoading: plansLoading, isError: plansError, error: plansErrorValue } = useAdminSubscriptionPlans();
  const { data: subscriptions = [], isLoading: subscriptionsLoading, isError: subscriptionsError, error: subscriptionsErrorValue } = useAdminSubscriptionQueue();
  const { data: onboarding = [], isLoading: onboardingLoading, isError: onboardingError, error: onboardingErrorValue } = useAdminOnboardingClients();
  const { data: outlets = [], isLoading: outletsLoading, isError: outletsError, error: outletsErrorValue } = useAdminOutletsDirectory();
  const { data: leads = [], isLoading: leadsLoading, isError: leadsError, error: leadsErrorValue } = useAdminDemoRequests();
  const { data: invoices = [], isLoading: invoicesLoading, isError: invoicesError, error: invoicesErrorValue } = useAdminInvoices();
  const { data: supportTickets = [], isLoading: supportLoading, isError: supportError, error: supportErrorValue } = useAdminSupportTickets();
  const { data: notifications = [], isLoading: notificationsLoading, isError: notificationsError, error: notificationsErrorValue } = useAdminNotifications();

  const primaryLoading = clientsLoading || plansLoading || subscriptionsLoading || onboardingLoading || outletsLoading;
  const primaryError = clientsError || plansError || subscriptionsError || onboardingError || outletsError;

  const primaryErrorMessage =
    (clientsErrorValue instanceof Error && clientsErrorValue.message) ||
    (plansErrorValue instanceof Error && plansErrorValue.message) ||
    (subscriptionsErrorValue instanceof Error && subscriptionsErrorValue.message) ||
    (onboardingErrorValue instanceof Error && onboardingErrorValue.message) ||
    (outletsErrorValue instanceof Error && outletsErrorValue.message) ||
    "Admin dashboard data could not be loaded.";

  const opsErrorMessage =
    (supportErrorValue instanceof Error && supportErrorValue.message) ||
    (notificationsErrorValue instanceof Error && notificationsErrorValue.message) ||
    (invoicesErrorValue instanceof Error && invoicesErrorValue.message) ||
    "Support and billing alerts could not be loaded.";

  const planPriceMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.price])), [plans]);

  const monthlyRecurringRevenue = useMemo(
    () =>
      subscriptions.reduce((sum, subscription) => {
        const monthlyValue = planPriceMap.get(subscription.plan_id) ?? 0;
        return ["active", "trial"].includes(subscription.subscription_status.toLowerCase()) ? sum + monthlyValue : sum;
      }, 0),
    [planPriceMap, subscriptions],
  );

  const metrics = useMemo(
    () => [
      { title: "Total Clients", value: String(clients.length), delta: `${clients.filter((client) => client.last_active).length} signed in`, icon: Users },
      { title: "Active Clients", value: String(clients.filter((client) => client.client_status === "Active").length), delta: "Live accounts", icon: Building2 },
      { title: "Trial Clients", value: String(clients.filter((client) => client.client_status === "Trial").length), delta: "Need conversion follow-up", icon: Rocket },
      { title: "Total Outlets", value: String(outlets.length), delta: `${outlets.filter((outlet) => outlet.outlet_status === "Active").length} active outlets`, icon: Building2 },
      { title: "Active Subscriptions", value: String(subscriptions.filter((subscription) => subscription.subscription_status.toLowerCase() === "active").length), delta: "Current live plans", icon: CreditCard },
      { title: "Expiring Soon", value: String(subscriptions.filter((subscription) => isExpiringSoon(subscription.expires_at)).length), delta: "Renew within 7 days", icon: AlertTriangle },
      { title: "Estimated MRR", value: formatCurrency(monthlyRecurringRevenue), delta: "Based on current assigned plans", icon: TrendingUp },
      { title: "Pending Onboarding", value: String(onboarding.filter((record) => record.onboarding_status !== "Ready").length), delta: "Needs activation work", icon: Rocket },
      { title: "Pending Tickets", value: supportLoading ? "..." : String(supportTickets.filter((ticket) => ticket.status.toLowerCase() !== "resolved").length), delta: supportLoading ? "Syncing support queue" : "Open support queue", icon: LifeBuoy },
      { title: "Failed Payments", value: invoicesLoading ? "..." : String(invoices.filter((invoice) => invoice.status.toLowerCase() === "failed").length), delta: invoicesLoading ? "Syncing finance feed" : "Invoices needing finance recovery", icon: ReceiptText },
    ],
    [clients, invoices, invoicesLoading, monthlyRecurringRevenue, onboarding, outlets, subscriptions, supportLoading, supportTickets],
  );

  const clientStatusMix = useMemo(
    () =>
      Object.entries(
        clients.reduce<Record<string, number>>((accumulator, client) => {
          accumulator[client.client_status] = (accumulator[client.client_status] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [clients],
  );

  const planDistribution = useMemo(() => plans.map((plan) => ({ name: plan.name, value: plan.total_clients })), [plans]);

  const onboardingStatusMix = useMemo(
    () =>
      Object.entries(
        onboarding.reduce<Record<string, number>>((accumulator, record) => {
          accumulator[record.onboarding_status] = (accumulator[record.onboarding_status] ?? 0) + 1;
          return accumulator;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [onboarding],
  );

  const outletCityMix = useMemo(
    () =>
      Object.entries(
        outlets.reduce<Record<string, number>>((accumulator, outlet) => {
          accumulator[outlet.city] = (accumulator[outlet.city] ?? 0) + 1;
          return accumulator;
        }, {}),
      )
        .map(([name, value]) => ({ name, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6),
    [outlets],
  );

  const moduleCoverage = useMemo(
    () => [
      { name: "QR Ordering", usage: plans.reduce((sum, plan) => sum + (plan.total_clients || 0), 0) },
      { name: "Kitchen Display", usage: plans.filter((plan) => plan.feature_kitchen_display).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Inventory", usage: plans.filter((plan) => plan.feature_inventory).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Analytics", usage: plans.filter((plan) => plan.feature_analytics).reduce((sum, plan) => sum + plan.total_clients, 0) },
      { name: "Coupons", usage: plans.filter((plan) => plan.feature_coupons).reduce((sum, plan) => sum + plan.total_clients, 0) },
    ],
    [plans],
  );

  const recentClients = useMemo(() => clients.slice(0, 4), [clients]);
  const latestLeads = useMemo(() => leads.slice(0, 4), [leads]);
  const expiringSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => isExpiringSoon(subscription.expires_at)).slice(0, 4),
    [subscriptions],
  );
  const onboardingFocus = useMemo(
    () => onboarding.filter((record) => record.onboarding_status !== "Ready").slice(0, 4),
    [onboarding],
  );
  const urgentTickets = useMemo(
    () => supportTickets.filter((ticket) => ticket.status.toLowerCase() !== "resolved").slice(0, 4),
    [supportTickets],
  );
  const activeAlerts = useMemo(
    () => notifications.filter((notification) => notification.status.toLowerCase() !== "resolved").slice(0, 4),
    [notifications],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Super Admin Dashboard"
          description="Platform-wide live view of client health, subscriptions, onboarding, outlets, and feature coverage across Adruva."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[160px] rounded-2xl border-slate-200 bg-white">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current snapshot</SelectItem>
                  <SelectItem value="30d">Next 30 days focus</SelectItem>
                  <SelectItem value="90d">Quarter snapshot</SelectItem>
                </SelectContent>
              </Select>

              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="rounded-2xl">
                    Quick Actions
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Quick actions</DrawerTitle>
                    <DrawerDescription>Jump directly into the admin surfaces already wired to real data.</DrawerDescription>
                  </DrawerHeader>
                  <div className="grid gap-3 px-4 pb-6 md:grid-cols-2">
                    <Button asChild variant="outline" className="justify-start rounded-2xl">
                      <Link to="/admin/clients">Review client portfolio</Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start rounded-2xl">
                      <Link to="/admin/subscriptions">Manage subscriptions</Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start rounded-2xl">
                      <Link to="/admin/outlets">Audit outlet registry</Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start rounded-2xl">
                      <Link to="/admin/onboarding">Work onboarding queue</Link>
                    </Button>
                  </div>
                  <DrawerFooter>
                    <Button asChild className="rounded-2xl bg-slate-900 hover:bg-slate-800">
                      <Link to="/admin/clients">Open operations workspace</Link>
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          }
        />

        {primaryLoading ? (
          <>
            <AdminLoadingState />
            <div className="grid gap-6 xl:grid-cols-3">
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : primaryError ? (
          <AdminTableEmptyState title="Could not load dashboard" description={primaryErrorMessage} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {metrics.map((metric) => (
                <AdminMetricCard key={metric.title} {...metric} />
              ))}
            </div>

            <Suspense
              fallback={
                <>
                  <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
                    <ChartSkeleton />
                    <ChartSkeleton />
                  </div>
                  <div className="grid gap-6 xl:grid-cols-3">
                    <ChartSkeleton />
                    <ChartSkeleton />
                    <ChartSkeleton />
                  </div>
                </>
              }
            >
              <AdminDashboardCharts
                chartColors={chartColors}
                clientStatusMix={clientStatusMix}
                planDistribution={planDistribution}
                onboardingStatusMix={onboardingStatusMix}
                outletCityMix={outletCityMix}
                moduleCoverage={moduleCoverage}
              />
            </Suspense>
          </>
        )}

        {!primaryLoading && !primaryError ? (
          <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-5">
            <AdminPanelCard title="Recently Active Clients" description="Clients sorted by most recent sign-in activity.">
              <div className="space-y-3">
                {recentClients.length ? (
                  recentClients.map((client) => (
                    <div key={client.owner_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{client.client_name}</p>
                          <p className="text-sm text-slate-500">
                            {client.owner_name} | {client.contact}
                          </p>
                        </div>
                        <AdminStatusBadge value={client.client_status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <AdminTableEmptyState title="No recent clients" description="Client activity will appear once accounts start logging in." />
                )}
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Latest Website Leads" description="Fresh consultation requests captured from the public landing page.">
              {leadsLoading ? (
                <PanelListSkeleton />
              ) : leadsError ? (
                <AdminTableEmptyState
                  title="Lead feed unavailable"
                  description={(leadsErrorValue instanceof Error && leadsErrorValue.message) || "Website lead sync is temporarily unavailable."}
                />
              ) : (
                <div className="space-y-3">
                  {latestLeads.length ? (
                    latestLeads.map((lead) => (
                      <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{lead.restaurant_name}</p>
                            <p className="text-sm text-slate-500">
                              {lead.name} | {lead.phone}
                            </p>
                            <p className="text-xs text-slate-400">
                              {lead.email ?? "Email not provided"} | {lead.city ?? "City not provided"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <AdminStatusBadge value={formatLeadStatus(lead.lead_status)} />
                            {lead.demo_scheduled_at ? (
                              <span className="text-[11px] text-slate-500">
                                Demo {new Date(lead.demo_scheduled_at).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminTableEmptyState title="No recent leads" description="New consultation requests from the website will appear here." />
                  )}
                </div>
              )}
            </AdminPanelCard>

            <AdminPanelCard title="Expiring Subscriptions" description="Renewal follow-ups due within the next 7 days.">
              <div className="space-y-3">
                {expiringSubscriptions.length ? (
                  expiringSubscriptions.map((subscription) => (
                    <div key={subscription.subscription_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{subscription.client_name}</p>
                          <p className="text-sm text-slate-500">
                            {subscription.plan_name} | expires{" "}
                            {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "Not set"}
                          </p>
                        </div>
                        <AdminStatusBadge
                          value={subscription.subscription_status.charAt(0).toUpperCase() + subscription.subscription_status.slice(1)}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <AdminTableEmptyState title="No urgent renewals" description="Nothing is expiring in the next 7 days." />
                )}
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Onboarding Focus" description="Accounts still moving toward go-live.">
              <div className="space-y-3">
                {onboardingFocus.length ? (
                  onboardingFocus.map((record) => (
                    <div key={record.owner_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{record.client_name}</p>
                          <p className="text-sm text-slate-500">{record.owner_name}</p>
                        </div>
                        <AdminStatusBadge value={record.onboarding_status} />
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${record.progress}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <AdminTableEmptyState title="No onboarding queue" description="Current clients are either ready or onboarding data is not needed yet." />
                )}
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Billing & Support Tracking" description="Live ops alerts from invoices, support tickets, and notification workflow.">
              {supportLoading || notificationsLoading || invoicesLoading ? (
                <PanelListSkeleton />
              ) : supportError || notificationsError || invoicesError ? (
                <AdminTableEmptyState title="Ops feed unavailable" description={opsErrorMessage} />
              ) : (
                <div className="space-y-3">
                  {urgentTickets.length ? (
                    urgentTickets.map((ticket) => (
                      <div key={ticket.ticket_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{ticket.subject}</p>
                            <p className="text-sm text-slate-500">
                              {ticket.client_name} - {ticket.ticket_number}
                            </p>
                          </div>
                          <AdminStatusBadge value={ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <AdminTableEmptyState title="Support queue is clear" description="No unresolved tickets are currently waiting in the admin queue." />
                  )}

                  {activeAlerts.length ? (
                    activeAlerts.map((notification) => (
                      <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{notification.title}</p>
                            <p className="text-sm text-slate-500">
                              {notification.client_name} - {(notification.target_module ?? "general").replaceAll("_", " ")}
                            </p>
                          </div>
                          <AdminStatusBadge value={notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Bell className="h-4 w-4" />
                        Notification feed is currently quiet.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AdminPanelCard>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
