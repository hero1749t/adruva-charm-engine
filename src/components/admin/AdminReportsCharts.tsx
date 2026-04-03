import { AdminPanelCard, AdminTableEmptyState } from "@/components/admin/AdminPrimitives";
import {
  SimpleDonutChart,
  SimpleHorizontalBarChart,
  SimpleVerticalBarChart,
} from "@/components/charts/LightweightCharts";
import { formatCurrency } from "@/lib/adminSuperData";

type RevenueDatum = {
  month: string;
  billed: number;
  paid: number;
  failed: number;
};

type SubscriptionDatum = {
  month: string;
  subscriptions: number;
  renewals: number;
};

type UsageDatum = {
  name: string;
  usage: number;
};

type DistributionDatum = {
  name: string;
  value: number;
};

type Props = {
  revenueTrend: RevenueDatum[];
  subscriptionTrend: SubscriptionDatum[];
  planDistribution: DistributionDatum[];
  ticketStatusMix: DistributionDatum[];
  notificationMix: DistributionDatum[];
  moduleCoverage: UsageDatum[];
  onboardingMix: DistributionDatum[];
  chartColors: string[];
};

const AdminReportsCharts = ({
  revenueTrend,
  subscriptionTrend,
  planDistribution,
  ticketStatusMix,
  notificationMix,
  moduleCoverage,
  onboardingMix,
  chartColors,
}: Props) => (
  <>
    <div className="grid gap-6 xl:grid-cols-2">
      <AdminPanelCard title="Revenue Trend" description="Billed, recovered, and failed invoice value by month.">
        {revenueTrend.some((item) => item.billed > 0) ? (
          <SimpleVerticalBarChart
            data={revenueTrend}
            xKey="month"
            bars={[
              { key: "billed", label: "Billed", color: "#f97316" },
              { key: "paid", label: "Paid", color: "#0f172a" },
              { key: "failed", label: "Failed", color: "#ef4444" },
            ]}
            height={320}
            valueFormatter={(value) => formatCurrency(value)}
          />
        ) : (
          <AdminTableEmptyState title="No billing trend yet" description="Invoice history needs a little more time to produce a meaningful trend line." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Subscription Activation Trend" description="New subscription records and renewal-covered accounts over time.">
        {subscriptionTrend.some((item) => item.subscriptions > 0) ? (
          <SimpleVerticalBarChart
            data={subscriptionTrend}
            xKey="month"
            bars={[
              { key: "subscriptions", label: "Subscriptions", color: "#0f172a" },
              { key: "renewals", label: "Renewals", color: "#f97316" },
            ]}
            height={320}
          />
        ) : (
          <AdminTableEmptyState title="No subscription history yet" description="Subscription analytics will populate as more client plan activity accumulates." />
        )}
      </AdminPanelCard>
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <AdminPanelCard title="Plan Distribution" description="Current client spread across platform plans.">
        {planDistribution.length ? (
          <SimpleDonutChart data={planDistribution} colors={chartColors} centerLabel="Plans" />
        ) : (
          <AdminTableEmptyState title="No plan distribution yet" description="Plan analytics will appear as client subscriptions are assigned." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Support Resolution Mix" description="Open, in-progress, escalated, and resolved ticket counts.">
        {ticketStatusMix.length ? (
          <SimpleVerticalBarChart
            data={ticketStatusMix}
            xKey="name"
            bars={[{ key: "value", label: "Tickets", color: "#f97316" }]}
            height={300}
          />
        ) : (
          <AdminTableEmptyState title="No support data yet" description="Ticket analytics will appear once the ops queue is used." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Notification Severity" description="Current alert pressure across warning, critical, and info streams.">
        {notificationMix.length ? (
          <SimpleDonutChart data={notificationMix} colors={chartColors} centerLabel="Alerts" />
        ) : (
          <AdminTableEmptyState title="No notification pressure" description="Alert severity mix will appear when notifications are generated." />
        )}
      </AdminPanelCard>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <AdminPanelCard title="Module Usage Coverage" description="Clients currently on plans that include each feature module.">
        {moduleCoverage.length ? (
          <SimpleHorizontalBarChart
            data={moduleCoverage}
            labelKey="name"
            valueKey="usage"
            color="#0f172a"
            valueFormatter={(value) => `${value} clients`}
          />
        ) : (
          <AdminTableEmptyState title="No module usage yet" description="Feature coverage analytics need active plan assignments." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Onboarding Completion" description="Current onboarding status mix across the client portfolio.">
        {onboardingMix.length ? (
          <SimpleVerticalBarChart
            data={onboardingMix}
            xKey="name"
            bars={[{ key: "value", label: "Clients", color: "#22c55e" }]}
            height={340}
          />
        ) : (
          <AdminTableEmptyState title="No onboarding pipeline yet" description="Onboarding analytics will show once setup signals are available." />
        )}
      </AdminPanelCard>
    </div>
  </>
);

export default AdminReportsCharts;

