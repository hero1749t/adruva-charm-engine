import { AdminPanelCard, AdminTableEmptyState } from "@/components/admin/AdminPrimitives";
import {
  SimpleDonutChart,
  SimpleHorizontalBarChart,
  SimpleVerticalBarChart,
} from "@/components/charts/LightweightCharts";

type ChartDatum = {
  name: string;
  value: number;
};

type CoverageDatum = {
  name: string;
  usage: number;
};

type Props = {
  chartColors: string[];
  clientStatusMix: ChartDatum[];
  planDistribution: ChartDatum[];
  onboardingStatusMix: ChartDatum[];
  outletCityMix: ChartDatum[];
  moduleCoverage: CoverageDatum[];
};

const AdminDashboardCharts = ({
  chartColors,
  clientStatusMix,
  planDistribution,
  onboardingStatusMix,
  outletCityMix,
  moduleCoverage,
}: Props) => (
  <>
    <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <AdminPanelCard title="Client Status Mix" description="Current client health distribution from live client records.">
        {clientStatusMix.length ? (
          <SimpleDonutChart data={clientStatusMix} colors={chartColors} centerLabel="Clients" />
        ) : (
          <AdminTableEmptyState title="No client mix yet" description="Client records will appear here once owners are provisioned." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Plan Distribution" description="Assigned client volume across live subscription plans.">
        {planDistribution.length ? (
          <SimpleDonutChart data={planDistribution} colors={chartColors} centerLabel="Plans" />
        ) : (
          <AdminTableEmptyState title="No plans assigned yet" description="Plan usage will populate as client subscriptions are assigned." />
        )}
      </AdminPanelCard>
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <AdminPanelCard title="Onboarding Pipeline" description="Current onboarding status counts derived from real setup signals.">
        {onboardingStatusMix.length ? (
          <SimpleVerticalBarChart
            data={onboardingStatusMix}
            xKey="name"
            bars={[{ key: "value", label: "Clients", color: "#f97316" }]}
            height={260}
          />
        ) : (
          <AdminTableEmptyState title="No onboarding data yet" description="Onboarding cards will populate as client records are configured." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Outlet Footprint" description="Top cities by number of registered outlets.">
        {outletCityMix.length ? (
          <SimpleVerticalBarChart
            data={outletCityMix}
            xKey="name"
            bars={[{ key: "value", label: "Outlets", color: "#0f172a" }]}
            height={260}
          />
        ) : (
          <AdminTableEmptyState title="No outlet registry yet" description="Outlet coverage will show once branches are created." />
        )}
      </AdminPanelCard>

      <AdminPanelCard title="Module Coverage" description="How many clients currently sit on plans that include each feature.">
        {moduleCoverage.length ? (
          <SimpleHorizontalBarChart
            data={moduleCoverage}
            labelKey="name"
            valueKey="usage"
            color="#0f172a"
            valueFormatter={(value) => `${value} clients`}
          />
        ) : (
          <AdminTableEmptyState title="No feature coverage yet" description="Plan-linked module access will appear here once subscriptions exist." />
        )}
      </AdminPanelCard>
    </div>
  </>
);

export default AdminDashboardCharts;

