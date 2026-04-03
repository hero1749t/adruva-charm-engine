import { FileText, LayoutTemplate, MessageSquareText, QrCode, Rocket, UtensilsCrossed } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { AdminPanelCard, AdminSectionHeader, AdminStatusBadge } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";

const templateCatalog = [
  {
    id: "menu-experience",
    title: "Menu Experience Template",
    description: "Live customer menu, branding, theme color, and font personalization already available in owner settings.",
    type: "Menu",
    status: "Live",
    icon: UtensilsCrossed,
    action: "Managed from Owner Settings + Menu",
  },
  {
    id: "invoice-receipt",
    title: "Invoice & Receipt Template",
    description: "Receipt and billing presentation is live through the billing workflow. Dedicated PDF generation is intentionally handled outside this operational admin view.",
    type: "Invoice",
    status: "Active",
    icon: FileText,
    action: "Managed from Billing / Payments",
  },
  {
    id: "qr-launch-kit",
    title: "QR Launch Kit",
    description: "QR routing, occupied-table protection, and outlet/table rollout are live in the current platform.",
    type: "QR",
    status: "Active",
    icon: QrCode,
    action: "Managed from Tables & QR / Rooms & QR",
  },
  {
    id: "whatsapp-sales",
    title: "WhatsApp Lead Template",
    description: "Consultation lead handoff opens a prefilled WhatsApp flow today. API-managed automation can be added later if needed.",
    type: "WhatsApp",
    status: "Pending",
    icon: MessageSquareText,
    action: "Live as click-to-WhatsApp",
  },
  {
    id: "onboarding-playbook",
    title: "Onboarding Playbook",
    description: "The onboarding checklist and readiness signals are live in admin ops, with progress tracked from real client setup data.",
    type: "Onboarding",
    status: "Live",
    icon: Rocket,
    action: "Managed from Admin Onboarding",
  },
  {
    id: "admin-shell",
    title: "Admin Workspace Layout",
    description: "The super-admin shell, dashboards, ops center, and reports now run on the current live platform data model.",
    type: "Workspace",
    status: "Live",
    icon: LayoutTemplate,
    action: "Managed from Admin modules",
  },
];

const AdminTemplates = () => (
  <AdminLayout>
    <div className="space-y-6">
      <AdminSectionHeader
        title="Templates"
        description="Platform template inventory showing what is already live versus what is still bounded as a future managed-template workflow."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templateCatalog.map((template) => {
          const Icon = template.icon;
          return (
            <AdminPanelCard key={template.id} title={template.title} description={`${template.type} template layer`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <AdminStatusBadge value={template.status} />
                </div>

                <p className="text-sm text-slate-600">{template.description}</p>

                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {template.action}
                </div>

                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Managed workflow only
                </Button>
              </div>
            </AdminPanelCard>
          );
        })}
      </div>
    </div>
  </AdminLayout>
);

export default AdminTemplates;
