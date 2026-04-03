import { Layers3, Minus, Rocket, ShieldCheck, Sparkles } from "lucide-react";

import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { useAdminSubscriptionPlans, type AdminSubscriptionPlan } from "@/hooks/useAdminSubscriptions";
import { cn } from "@/lib/utils";

type ModuleKey =
  | "feature_online_orders"
  | "feature_inventory"
  | "feature_kitchen_display"
  | "feature_customer_reviews"
  | "feature_analytics"
  | "feature_chain"
  | "feature_expenses"
  | "feature_coupons"
  | "feature_white_label";

const moduleCatalog: Array<{
  key: ModuleKey;
  name: string;
  description: string;
}> = [
  { key: "feature_online_orders", name: "QR Ordering", description: "Customer menu, table QR, and public order placement." },
  { key: "feature_inventory", name: "Inventory", description: "Ingredient tracking, stock deduction, and recipe linkage." },
  { key: "feature_kitchen_display", name: "Kitchen Display", description: "Real-time order queue for kitchen operations." },
  { key: "feature_customer_reviews", name: "Feedback", description: "Review capture and customer satisfaction workflow." },
  { key: "feature_analytics", name: "Advanced Reports", description: "Owner-facing analytics, trends, and operational summaries." },
  { key: "feature_chain", name: "Multi Outlet", description: "Chain, branch, and outlet management across locations." },
  { key: "feature_expenses", name: "Expenses", description: "Expense capture and owner-side reporting workflows." },
  { key: "feature_coupons", name: "Coupons", description: "Customer promo codes and discount validation flow." },
  { key: "feature_white_label", name: "Custom Branding", description: "Brand customization and premium presentation controls." },
];

const isFeatureEnabled = (plan: AdminSubscriptionPlan, key: ModuleKey) => Boolean(plan[key]);

const AdminModules = () => {
  const { data: plans = [], isLoading, isError, error } = useAdminSubscriptionPlans();

  const enabledCount = moduleCatalog.filter((module) => plans.some((plan) => isFeatureEnabled(plan, module.key))).length;
  const enterpriseOnlyCount = moduleCatalog.filter(
    (module) =>
      plans.some((plan) => plan.name.toLowerCase() === "enterprise" && isFeatureEnabled(plan, module.key)) &&
      plans.filter((plan) => plan.name.toLowerCase() !== "enterprise").every((plan) => !isFeatureEnabled(plan, module.key)),
  ).length;
  const mostAdoptedPlan = plans.reduce<AdminSubscriptionPlan | null>((current, plan) => {
    if (!current) return plan;
    return plan.active_clients > current.active_clients ? plan : current;
  }, null);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Feature Access / Modules"
          description="Live plan-level module availability across the platform. This view reflects the current subscription catalog instead of simulated toggles."
        />

        {isLoading ? (
          <AdminLoadingState />
        ) : isError ? (
          <AdminTableEmptyState
            title="Could not load module access"
            description={error instanceof Error ? error.message : "The live plan catalog could not be loaded right now."}
          />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <AdminPanelCard title="Live Modules" description="Modules currently modeled in the subscription catalog.">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-sm text-slate-500">Enabled somewhere</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{enabledCount}</p>
                  </div>
                  <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                    <Layers3 className="h-5 w-5" />
                  </div>
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Enterprise-only" description="Modules reserved to the top commercial tier.">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-sm text-slate-500">Exclusive controls</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{enterpriseOnlyCount}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
              </AdminPanelCard>

              <AdminPanelCard title="Most Adopted Plan" description="Commercial tier with the most currently active clients.">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-sm text-slate-500">Top active plan</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{mostAdoptedPlan?.name ?? "Not available"}</p>
                    <p className="mt-1 text-sm text-slate-500">{mostAdoptedPlan?.active_clients ?? 0} active clients</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <Rocket className="h-5 w-5" />
                  </div>
                </div>
              </AdminPanelCard>
            </div>

            <AdminPanelCard title="Plan Access Matrix" description="Read-only module coverage derived from the live subscription plans.">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <div className="grid min-w-[840px] grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(120px,1fr))]">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Module
                  </div>
                  {plans.map((plan) => (
                    <div key={plan.id} className="border-b border-l border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <span>{plan.name}</span>
                        <AdminStatusBadge value={plan.is_active ? "Live" : "Paused"} />
                      </div>
                    </div>
                  ))}

                  {moduleCatalog.flatMap((module) => [
                    <div key={`${module.key}-meta`} className="border-b border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{module.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{module.description}</p>
                        </div>
                      </div>
                    </div>,
                    ...plans.map((plan) => {
                      const enabled = isFeatureEnabled(plan, module.key);
                      return (
                        <div
                          key={`${module.key}-${plan.id}`}
                          className={cn(
                            "flex items-center justify-center border-b border-l border-slate-200 px-4 py-4 text-sm",
                            enabled ? "bg-emerald-50/50 text-emerald-700" : "bg-white text-slate-400",
                          )}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={cn("rounded-full p-2", enabled ? "bg-emerald-100" : "bg-slate-100")}>
                              {enabled ? <ShieldCheck className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </div>
                            <span className="font-medium">{enabled ? "Included" : "Not included"}</span>
                          </div>
                        </div>
                      );
                    }),
                  ])}
                </div>
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Commercial Notes" description="What this page represents today.">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Module access is driven by the live `subscription_plans` table rather than local toggle state.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Client-specific plan changes are managed from the Subscriptions & Plans queue.
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Add-on bundles and coupon packs are not modeled separately yet, so they are intentionally not shown as editable controls here.
                </div>
              </div>
            </AdminPanelCard>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminModules;
