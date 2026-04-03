import AdminLayout from "@/components/AdminLayout";
import { AdminPanelCard, AdminSectionHeader, AdminStatusBadge } from "@/components/admin/AdminPrimitives";

const platformDefaults = [
  { label: "Platform brand", value: "Adruva" },
  { label: "Currency", value: "INR" },
  { label: "Timezone", value: "Asia/Kolkata" },
  { label: "Default billing tax", value: "18%" },
  { label: "Deployment target", value: "Vercel Production" },
  { label: "Primary data plane", value: "Supabase" },
];

const operationalGuards = [
  { label: "Supabase auth persistence", status: "Active", note: "Owner and admin auth sessions persist across refresh." },
  { label: "Admin audit logging", status: "Active", note: "Billing, support, subscription, and notification actions now write to activity logs." },
  { label: "Public order RPC protection", status: "Active", note: "Customer order placement and coupon validation run through server-side RPC guards." },
  { label: "Maintenance mode", status: "Pending", note: "There is no app-wide maintenance banner toggle modeled yet, so this remains code-managed." },
  { label: "Automated backups", status: "Pending", note: "Backups are currently managed at the platform/database level, not from this app UI." },
  { label: "Forced admin 2FA", status: "Pending", note: "Can be enforced later at auth/provider policy level if required." },
];

const AdminSystemSettings = () => (
  <AdminLayout>
    <div className="space-y-6">
      <AdminSectionHeader
        title="System Settings"
        description="Readonly operational configuration for platform defaults and safeguards. Items only appear editable once a real persistence layer exists."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanelCard title="Platform Defaults" description="Current live configuration that the product is running with today.">
          <div className="space-y-3">
            {platformDefaults.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="Security & Operations" description="Truthful state of operational controls instead of fake toggles.">
          <div className="space-y-3">
            {operationalGuards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">{item.label}</span>
                  <AdminStatusBadge value={item.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.note}</p>
              </div>
            ))}
          </div>
        </AdminPanelCard>
      </div>
    </div>
  </AdminLayout>
);

export default AdminSystemSettings;
