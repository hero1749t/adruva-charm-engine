import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Filter, Search } from "lucide-react";

import AdminLayout from "@/components/AdminLayout";
import {
  AdminLoadingState,
  AdminPanelCard,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTableEmptyState,
} from "@/components/admin/AdminPrimitives";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminActivityLogs } from "@/hooks/useAdminOpsCenter";

const modules = ["all", "Payments", "Support", "Subscriptions", "Notifications"] as const;

const AdminActivity = () => {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<(typeof modules)[number]>("all");
  const activityQuery = useAdminActivityLogs();

  const filteredLogs = useMemo(
    () =>
      (activityQuery.data ?? []).filter((log) => {
        const haystack = [log.user, log.action, log.module, log.target, log.client_name, log.ip_device, log.result].join(" ").toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesModule = moduleFilter === "all" || log.module === moduleFilter;
        return matchesQuery && matchesModule;
      }),
    [activityQuery.data, moduleFilter, query],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Activity Logs"
          description="Admin audit trail across billing, support, subscriptions, and notification operations."
        />

        {activityQuery.isLoading ? (
          <AdminLoadingState />
        ) : activityQuery.isError ? (
          <AdminTableEmptyState
            title="Could not load activity logs"
            description={activityQuery.error instanceof Error ? activityQuery.error.message : "Admin activity logs could not be loaded."}
          />
        ) : (
          <AdminPanelCard title="Audit Trail" description="Searchable event stream for platform governance, support forensics, and operational review.">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by user, action, module, target, client, or device"
                  className="rounded-2xl pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={moduleFilter} onValueChange={(value) => setModuleFilter(value as (typeof modules)[number])}>
                  <SelectTrigger className="w-[220px] rounded-2xl">
                    <SelectValue placeholder="Filter module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    <SelectItem value="Payments">Payments</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Subscriptions">Subscriptions</SelectItem>
                    <SelectItem value="Notifications">Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredLogs.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>IP / Device</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.timestamp), "dd MMM yyyy, hh:mm a")}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.module}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">{log.target}</TableCell>
                        <TableCell>{log.client_name}</TableCell>
                        <TableCell>{log.ip_device}</TableCell>
                        <TableCell><AdminStatusBadge value={log.result} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <AdminTableEmptyState title="No activity logs match this filter" description="Try a broader search or switch back to all modules." />
            )}
          </AdminPanelCard>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminActivity;
