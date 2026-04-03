import { useMemo, useState } from "react";
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
  type AdminDemoLeadRow,
  type AdminOnboardingRow,
  useAdminDemoRequests,
  useAdminOnboardingClients,
  useUpdateAdminDemoLead,
} from "@/hooks/useAdminOperations";
import { useAdminSubscriptionPlans } from "@/hooks/useAdminSubscriptions";

const labels: Array<[keyof Omit<
  AdminOnboardingRow,
  "owner_id" | "client_name" | "owner_name" | "onboarding_status" | "progress"
>, string]> = [
  ["business_info_complete", "Business info complete"],
  ["branding_uploaded", "Branding uploaded"],
  ["menu_imported", "Menu imported"],
  ["tax_configured", "Tax configured"],
  ["payment_setup_complete", "Payment setup complete"],
  ["qr_generated", "QR generated"],
  ["printer_connected", "Printer connected"],
  ["staff_accounts_created", "Staff accounts created"],
  ["test_order_completed", "Test order completed"],
  ["go_live_confirmed", "Go-live confirmed"],
];

type LeadDraft = {
  id: string;
  restaurant_name: string;
  lead_status: string;
  priority: string;
  proposed_plan_id: string;
  demo_scheduled_at: string;
  next_follow_up_at: string;
  meeting_notes: string;
  admin_notes: string;
};

const formatLeadStatus = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toInputDateTime = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

const AdminOnboarding = () => {
  const [activeTab, setActiveTab] = useState<"leads" | "activation">("leads");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadDraft, setLeadDraft] = useState<LeadDraft | null>(null);

  const leadsQuery = useAdminDemoRequests();
  const onboardingQuery = useAdminOnboardingClients();
  const plansQuery = useAdminSubscriptionPlans();
  const updateLead = useUpdateAdminDemoLead();

  const filteredLeads = useMemo(
    () =>
      (leadsQuery.data ?? []).filter((lead) => {
        const haystack = [
          lead.restaurant_name,
          lead.name,
          lead.email ?? "",
          lead.phone,
          lead.city ?? "",
          lead.lead_status,
        ]
          .join(" ")
          .toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || lead.lead_status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [leadsQuery.data, query, statusFilter],
  );

  const leadSummary = useMemo(
    () => ({
      new: (leadsQuery.data ?? []).filter((lead) => lead.lead_status === "new").length,
      scheduled: (leadsQuery.data ?? []).filter((lead) => lead.lead_status === "demo_scheduled").length,
      approved: (leadsQuery.data ?? []).filter((lead) => lead.lead_status === "approved").length,
      converted: (leadsQuery.data ?? []).filter((lead) => lead.lead_status === "converted").length,
    }),
    [leadsQuery.data],
  );

  const openLeadDialog = (lead: AdminDemoLeadRow) => {
    setLeadDraft({
      id: lead.id,
      restaurant_name: lead.restaurant_name,
      lead_status: lead.lead_status,
      priority: lead.priority,
      proposed_plan_id: lead.proposed_plan_id ?? "none",
      demo_scheduled_at: toInputDateTime(lead.demo_scheduled_at),
      next_follow_up_at: toInputDateTime(lead.next_follow_up_at),
      meeting_notes: lead.meeting_notes ?? "",
      admin_notes: lead.admin_notes ?? "",
    });
  };

  const saveLead = async () => {
    if (!leadDraft) return;

    try {
      await updateLead.mutateAsync({
        id: leadDraft.id,
        lead_status: leadDraft.lead_status,
        priority: leadDraft.priority,
        proposed_plan_id: leadDraft.proposed_plan_id === "none" ? null : leadDraft.proposed_plan_id,
        demo_scheduled_at: leadDraft.demo_scheduled_at
          ? new Date(leadDraft.demo_scheduled_at).toISOString()
          : null,
        next_follow_up_at: leadDraft.next_follow_up_at
          ? new Date(leadDraft.next_follow_up_at).toISOString()
          : null,
        meeting_notes: leadDraft.meeting_notes.trim() || null,
        admin_notes: leadDraft.admin_notes.trim() || null,
        approved_at:
          leadDraft.lead_status === "approved" || leadDraft.lead_status === "converted"
            ? new Date().toISOString()
            : null,
      });

      toast.success("Lead pipeline updated");
      setLeadDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update lead");
    }
  };

  const isLoading = leadsQuery.isLoading || onboardingQuery.isLoading || plansQuery.isLoading;
  const hasLeadError = leadsQuery.isError;
  const hasOnboardingError = onboardingQuery.isError;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Onboarding"
          description="Work the full client activation funnel from inbound lead, to demo, to approval, to operational go-live."
          action={
            <div className="flex gap-2">
              <Button variant={activeTab === "leads" ? "default" : "outline"} className="rounded-2xl" onClick={() => setActiveTab("leads")}>
                Lead Pipeline
              </Button>
              <Button variant={activeTab === "activation" ? "default" : "outline"} className="rounded-2xl" onClick={() => setActiveTab("activation")}>
                Activation Checklist
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <AdminLoadingState />
        ) : activeTab === "leads" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminPanelCard title="New Leads" description="Fresh website enquiries not yet contacted.">
                <p className="text-3xl font-semibold text-slate-900">{leadSummary.new}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Demo Scheduled" description="Leads with a confirmed demo slot.">
                <p className="text-3xl font-semibold text-slate-900">{leadSummary.scheduled}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Approved" description="Qualified leads ready for owner activation.">
                <p className="text-3xl font-semibold text-slate-900">{leadSummary.approved}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Converted" description="Leads that reached live client state.">
                <p className="text-3xl font-semibold text-slate-900">{leadSummary.converted}</p>
              </AdminPanelCard>
            </div>

            <AdminPanelCard
              title="Lead Pipeline"
              description="Capture website enquiries, schedule demos, propose plans, and mark leads approved before owner activation."
            >
              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search restaurant, owner, email, phone, or city"
                  className="max-w-md rounded-2xl"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[220px] rounded-2xl">
                    <SelectValue placeholder="Filter lead status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasLeadError ? (
                <AdminTableEmptyState
                  title="Could not load lead pipeline"
                  description={leadsQuery.error instanceof Error ? leadsQuery.error.message : "Lead data could not be loaded."}
                />
              ) : filteredLeads.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Restaurant</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Demo</TableHead>
                        <TableHead>Follow-up</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{lead.restaurant_name}</p>
                              <p className="text-xs text-slate-500">{lead.city ?? "City not provided"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-700">
                              <p>{lead.name}</p>
                              <p className="text-xs text-slate-500">{lead.email ?? "No email"} | {lead.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {plansQuery.data?.find((plan) => plan.id === lead.proposed_plan_id)?.name ?? "Not proposed"}
                          </TableCell>
                          <TableCell><AdminStatusBadge value={formatLeadStatus(lead.lead_status)} /></TableCell>
                          <TableCell><AdminStatusBadge value={lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)} /></TableCell>
                          <TableCell>{lead.demo_scheduled_at ? format(new Date(lead.demo_scheduled_at), "dd MMM yyyy, hh:mm a") : "Not scheduled"}</TableCell>
                          <TableCell>{lead.next_follow_up_at ? format(new Date(lead.next_follow_up_at), "dd MMM yyyy") : "Not set"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => openLeadDialog(lead)}>
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <AdminTableEmptyState title="No leads match this filter" description="Try a different status or clear the current search." />
              )}
            </AdminPanelCard>
          </>
        ) : hasOnboardingError ? (
          <AdminTableEmptyState
            title="Could not load onboarding records"
            description={onboardingQuery.error instanceof Error ? onboardingQuery.error.message : "An unexpected error occurred while loading onboarding progress."}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            {(onboardingQuery.data ?? []).map((record) => (
              <AdminPanelCard key={record.owner_id} title={record.client_name} description={record.owner_name}>
                <div className="mb-4 flex items-center justify-between">
                  <AdminStatusBadge value={record.onboarding_status} />
                  <span className="text-sm font-medium text-slate-900">{record.progress}% complete</span>
                </div>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${record.progress}%` }} />
                </div>
                <div className="space-y-2">
                  {labels.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">{label}</span>
                      <AdminStatusBadge value={record[key] ? "Active" : "Pending"} />
                    </div>
                  ))}
                </div>
              </AdminPanelCard>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(leadDraft)} onOpenChange={(open) => !open && setLeadDraft(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage lead pipeline</DialogTitle>
            <DialogDescription>
              Move the enquiry through contact, demo, approval, and client activation prep.
            </DialogDescription>
          </DialogHeader>

          {leadDraft ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{leadDraft.restaurant_name}</p>
                <p className="text-sm text-slate-500">Lead workflow and sales follow-up</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Lead status</label>
                  <Select value={leadDraft.lead_status} onValueChange={(value) => setLeadDraft((current) => current ? { ...current, lead_status: value } : current)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Select lead status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Priority</label>
                  <Select value={leadDraft.priority} onValueChange={(value) => setLeadDraft((current) => current ? { ...current, priority: value } : current)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Proposed plan</label>
                  <Select value={leadDraft.proposed_plan_id} onValueChange={(value) => setLeadDraft((current) => current ? { ...current, proposed_plan_id: value } : current)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No plan selected</SelectItem>
                      {(plansQuery.data ?? []).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Demo scheduled at</label>
                  <Input
                    type="datetime-local"
                    className="rounded-2xl"
                    value={leadDraft.demo_scheduled_at}
                    onChange={(event) => setLeadDraft((current) => current ? { ...current, demo_scheduled_at: event.target.value } : current)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Next follow-up</label>
                  <Input
                    type="datetime-local"
                    className="rounded-2xl"
                    value={leadDraft.next_follow_up_at}
                    onChange={(event) => setLeadDraft((current) => current ? { ...current, next_follow_up_at: event.target.value } : current)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Meeting notes</label>
                  <Textarea
                    className="min-h-[120px] rounded-2xl"
                    value={leadDraft.meeting_notes}
                    onChange={(event) => setLeadDraft((current) => current ? { ...current, meeting_notes: event.target.value } : current)}
                    placeholder="Capture discovery call notes, requirements, blockers, or budget fit."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Internal admin notes</label>
                  <Textarea
                    className="min-h-[120px] rounded-2xl"
                    value={leadDraft.admin_notes}
                    onChange={(event) => setLeadDraft((current) => current ? { ...current, admin_notes: event.target.value } : current)}
                    placeholder="Internal ops notes, approval rationale, handoff comments, or activation readiness."
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setLeadDraft(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={saveLead} disabled={updateLead.isPending}>
              {updateLead.isPending ? "Saving..." : "Save pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOnboarding;
