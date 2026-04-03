import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Filter, LifeBuoy, Search, UserCheck } from "lucide-react";
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
import { useAdminPlatformUsers } from "@/hooks/useAdminOperations";
import {
  useAdminSupportTickets,
  useAssignAdminSupportTicket,
  useResolveAdminSupportTicket,
  type AdminSupportTicketRow,
} from "@/hooks/useAdminOpsCenter";

type AssignmentDraft = {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  ownerId: string | null;
  assignedAgentId: string;
  status: string;
};

const formatSla = (value: string | null) => {
  if (!value) return "No SLA";
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
};

const AdminSupport = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignment, setAssignment] = useState<AssignmentDraft | null>(null);

  const ticketsQuery = useAdminSupportTickets();
  const platformUsersQuery = useAdminPlatformUsers();
  const assignTicket = useAssignAdminSupportTicket();
  const resolveTicket = useResolveAdminSupportTicket();

  const assignableAgents = useMemo(
    () =>
      (platformUsersQuery.data ?? []).filter(
        (user) => user.source === "admin" || ["Super Admin", "Admin", "Support Agent", "Onboarding Manager"].includes(user.role),
      ),
    [platformUsersQuery.data],
  );

  const filteredTickets = useMemo(
    () =>
      (ticketsQuery.data ?? []).filter((ticket) => {
        const haystack = [
          ticket.ticket_number,
          ticket.client_name,
          ticket.contact,
          ticket.subject,
          ticket.category,
          ticket.priority,
          ticket.assigned_agent,
        ]
          .join(" ")
          .toLowerCase();

        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || ticket.status.toLowerCase() === statusFilter;
        const matchesPriority = priorityFilter === "all" || ticket.priority.toLowerCase() === priorityFilter;
        return matchesQuery && matchesStatus && matchesPriority;
      }),
    [priorityFilter, query, statusFilter, ticketsQuery.data],
  );

  const summary = useMemo(
    () => ({
      open: filteredTickets.filter((ticket) => ["open", "in_progress", "escalated"].includes(ticket.status.toLowerCase())).length,
      critical: filteredTickets.filter((ticket) => ["critical", "high"].includes(ticket.priority.toLowerCase())).length,
      escalated: filteredTickets.filter((ticket) => ticket.status.toLowerCase() === "escalated").length,
      unassigned: filteredTickets.filter((ticket) => ticket.assigned_agent === "Unassigned").length,
    }),
    [filteredTickets],
  );

  const openAssignmentDialog = (ticket: AdminSupportTicketRow) => {
    setAssignment({
      ticketId: ticket.ticket_id,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      ownerId: ticket.owner_id,
      assignedAgentId: assignableAgents.find((agent) => agent.name === ticket.assigned_agent)?.user_id ?? "",
      status: ticket.status.toLowerCase(),
    });
  };

  const handleSaveAssignment = async () => {
    if (!assignment) return;

    try {
      await assignTicket.mutateAsync({
        ticketId: assignment.ticketId,
        assignedAgentId: assignment.assignedAgentId || null,
        status: assignment.status || null,
      });
      toast.success("Support ticket updated");
      setAssignment(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update support ticket");
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await resolveTicket.mutateAsync({ ticketId, status: "resolved" });
      toast.success("Support ticket resolved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve support ticket");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Support Tickets"
          description="Platform ticket queue with assignment, SLA urgency, and escalation visibility."
        />

        {ticketsQuery.isLoading || platformUsersQuery.isLoading ? (
          <AdminLoadingState />
        ) : ticketsQuery.isError ? (
          <AdminTableEmptyState
            title="Could not load support queue"
            description={ticketsQuery.error instanceof Error ? ticketsQuery.error.message : "Admin support data could not be loaded."}
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminPanelCard title="Open Queue" description="Tickets that still need action.">
                <p className="text-3xl font-semibold text-slate-900">{summary.open}</p>
              </AdminPanelCard>
              <AdminPanelCard title="High Priority" description="Critical or high urgency items.">
                <p className="text-3xl font-semibold text-slate-900">{summary.critical}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Escalated" description="Tickets beyond first-line handling.">
                <p className="text-3xl font-semibold text-slate-900">{summary.escalated}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Unassigned" description="Tickets waiting for an owner.">
                <p className="text-3xl font-semibold text-slate-900">{summary.unassigned}</p>
              </AdminPanelCard>
            </div>

            <AdminPanelCard title="Ticket Queue" description="Search, assign, and resolve platform support items from the same workspace.">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by ticket, client, subject, category, or assignee"
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px] rounded-2xl">
                      <SelectValue placeholder="Filter priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priority</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredTickets.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assigned Agent</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.ticket_id}>
                          <TableCell>
                            <p className="font-medium text-slate-900">{ticket.subject}</p>
                            <p className="text-xs text-slate-500">{ticket.ticket_number}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-slate-900">{ticket.client_name}</p>
                            <p className="text-xs text-slate-500">{ticket.contact || "No contact"}</p>
                          </TableCell>
                          <TableCell className="capitalize">{ticket.category.replaceAll("_", " ")}</TableCell>
                          <TableCell><AdminStatusBadge value={ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} /></TableCell>
                          <TableCell>{ticket.assigned_agent}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm text-slate-700">{formatSla(ticket.sla_due_at)}</p>
                              {ticket.escalation_level > 0 ? (
                                <p className="text-xs text-rose-600">Escalation L{ticket.escalation_level}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell><AdminStatusBadge value={ticket.status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="rounded-full" onClick={() => openAssignmentDialog(ticket)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Assign
                              </Button>
                              {ticket.status.toLowerCase() !== "resolved" ? (
                                <Button size="sm" className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={() => handleResolve(ticket.ticket_id)}>
                                  Resolve
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <AdminTableEmptyState title="No tickets match this filter" description="Try clearing the search or adjusting the selected ticket state." />
              )}
            </AdminPanelCard>
          </>
        )}
      </div>

      <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && setAssignment(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage support ticket</DialogTitle>
            <DialogDescription>Assign the ticket to an admin teammate and move it through the support flow.</DialogDescription>
          </DialogHeader>

          {assignment ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{assignment.subject}</p>
                <p className="text-sm text-slate-500">{assignment.ticketNumber}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assigned agent</label>
                  <Select value={assignment.assignedAgentId || "unassigned"} onValueChange={(value) => setAssignment((current) => current ? { ...current, assignedAgentId: value === "unassigned" ? "" : value } : current)}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Select admin agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {assignableAgents.map((agent) => (
                        <SelectItem key={agent.user_id} value={agent.user_id}>
                          {agent.name} - {agent.role}
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setAssignment(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={handleSaveAssignment} disabled={assignTicket.isPending}>
              {assignTicket.isPending ? "Saving..." : "Save ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupport;
