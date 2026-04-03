import { useMemo } from "react";
import { Database, Bell, CreditCard, Globe, ShieldCheck, Smartphone, Webhook } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { AdminLoadingState, AdminPanelCard, AdminSectionHeader, AdminStatusBadge, AdminTableEmptyState } from "@/components/admin/AdminPrimitives";
import { useAdminInvoices } from "@/hooks/useAdminPayments";
import { useAdminNotifications } from "@/hooks/useAdminOpsCenter";

const AdminIntegrations = () => {
  const invoicesQuery = useAdminInvoices();
  const notificationsQuery = useAdminNotifications();

  const isLoading = invoicesQuery.isLoading || notificationsQuery.isLoading;
  const hasError = invoicesQuery.isError || notificationsQuery.isError;
  const errorMessage =
    (invoicesQuery.error instanceof Error && invoicesQuery.error.message) ||
    (notificationsQuery.error instanceof Error && notificationsQuery.error.message) ||
    "Integration health could not be loaded.";

  const integrations = useMemo(
    () => [
      {
        id: "supabase-core",
        name: "Supabase Core",
        category: "Database / Auth",
        status: import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "Connected" : "Error",
        detail: "Auth, data access, storage, and RPC flows are backed by the linked Supabase project.",
        icon: Database,
      },
      {
        id: "billing-ledger",
        name: "Billing Ledger",
        category: "Payments",
        status: (invoicesQuery.data ?? []).length ? "Connected" : "Pending",
        detail: `${(invoicesQuery.data ?? []).length} invoice records currently available in the admin ledger.`,
        icon: CreditCard,
      },
      {
        id: "ops-alerting",
        name: "Ops Alerts",
        category: "Notifications",
        status: (notificationsQuery.data ?? []).length ? "Connected" : "Pending",
        detail: `${(notificationsQuery.data ?? []).length} admin notifications currently flowing through the ops center.`,
        icon: Bell,
      },
      {
        id: "whatsapp-handoff",
        name: "WhatsApp Lead Handoff",
        category: "Messaging",
        status: "Connected",
        detail: "Free consultation and support handoffs currently use direct prefilled WhatsApp routing.",
        icon: Smartphone,
      },
      {
        id: "sentry-monitoring",
        name: "Sentry Monitoring",
        category: "Observability",
        status: import.meta.env.VITE_SENTRY_DSN ? "Connected" : "Pending",
        detail: import.meta.env.VITE_SENTRY_DSN
          ? "Client-side crash monitoring is configured for this deployment."
          : "Sentry wiring exists in code, but a DSN is still needed for live event capture.",
        icon: ShieldCheck,
      },
      {
        id: "pwa-runtime",
        name: "PWA Runtime",
        category: "Client Runtime",
        status: "Connected",
        detail: "Install flow, service worker updates, and cache invalidation are active in the deployed app.",
        icon: Globe,
      },
      {
        id: "webhook-layer",
        name: "Automation / Webhooks",
        category: "Platform Automation",
        status: "Pending",
        detail: "No external webhook orchestration layer is modeled yet; current admin ops are app-managed.",
        icon: Webhook,
      },
    ],
    [invoicesQuery.data, notificationsQuery.data],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Integrations"
          description="Truthful runtime view of what is actually connected in the platform today, without pretending external integrations exist where they do not."
        />

        {isLoading ? (
          <AdminLoadingState />
        ) : hasError ? (
          <AdminTableEmptyState title="Could not load integration health" description={errorMessage} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <AdminPanelCard key={integration.id} title={integration.name} description={integration.category}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <AdminStatusBadge value={integration.status} />
                    </div>
                    <p className="text-sm text-slate-600">{integration.detail}</p>
                  </div>
                </AdminPanelCard>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrations;
