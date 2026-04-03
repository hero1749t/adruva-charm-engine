import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Filter, Plus, Search } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminClients } from "@/hooks/useAdminClients";
import { formatCurrency } from "@/lib/adminSuperData";
import { toast } from "sonner";

const AdminOwners = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: clients = [], isLoading, isError, error } = useAdminClients();

  useEffect(() => {
    setQuery(searchParams.get("query") ?? "");
  }, [searchParams]);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const haystack = [client.client_name, client.contact, client.owner_name, client.address ?? "", client.phone ?? ""]
          .join(" ")
          .toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || client.client_status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [clients, query, statusFilter],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Clients"
          description="Manage restaurant clients, lifecycle status, subscriptions, onboarding readiness, and health signals."
          action={
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Create new client</DialogTitle>
                  <DialogDescription>
                    Client creation is intentionally not exposed as a fake form here. The safe production flow today is owner signup first, then admin review and plan assignment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    1. Restaurant owner creates or signs into their account.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    2. Their profile appears automatically in the admin Clients module.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    3. Super admin assigns plan, follows onboarding, and manages support from the real operations workspace.
                  </div>
                </div>
                <Button
                  className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800"
                  onClick={() => toast.message("Use owner signup first, then manage the account from Clients, Subscriptions, and Onboarding.")}
                >
                  Understood
                </Button>
              </DialogContent>
            </Dialog>
          }
        />

        {isLoading ? (
          <AdminLoadingState />
        ) : (
          <AdminPanelCard title="Client Directory" description="Live client data from Supabase with subscription and onboarding signals.">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by client, owner, email, phone, or address" className="rounded-2xl pl-10" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] rounded-2xl">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Trial">Trial</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isError ? (
              <AdminTableEmptyState
                title="Could not load clients"
                description={error instanceof Error ? error.message : "An unexpected error occurred while loading client records."}
              />
            ) : filteredClients.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outlets</TableHead>
                      <TableHead>Onboarding</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Subscription Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.owner_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{client.client_name}</p>
                            <p className="text-xs text-slate-500">{client.owner_name} | {formatCurrency(client.monthly_revenue)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">
                            <p>{client.contact}</p>
                            {client.phone ? <p className="text-xs text-slate-500">{client.phone}</p> : null}
                          </div>
                        </TableCell>
                        <TableCell>{client.plan_name}</TableCell>
                        <TableCell><AdminStatusBadge value={client.client_status} /></TableCell>
                        <TableCell>{client.outlets_count}</TableCell>
                        <TableCell><AdminStatusBadge value={client.onboarding_status} /></TableCell>
                        <TableCell>{client.last_active ? new Date(client.last_active).toLocaleString() : "Never"}</TableCell>
                        <TableCell>{client.subscription_expiry ? new Date(client.subscription_expiry).toLocaleDateString() : "Not set"}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="rounded-full">
                            <Link to={`/admin/clients/${client.owner_id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <AdminTableEmptyState title="No clients match this filter" description="Try a different search or clear the selected status filter." />
            )}
          </AdminPanelCard>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOwners;
