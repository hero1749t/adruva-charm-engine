import { useMemo, useState } from "react";
import { Bell, CheckCheck, Filter, Search } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAdminNotifications,
  useAcknowledgeAdminNotification,
  useResolveAdminNotification,
} from "@/hooks/useAdminOpsCenter";

const formatAge = (value: string) =>
  formatDistanceToNowStrict(new Date(value), { addSuffix: true });

const AdminNotifications = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const notificationsQuery = useAdminNotifications();
  const acknowledgeNotification = useAcknowledgeAdminNotification();
  const resolveNotification = useResolveAdminNotification();

  const filteredNotifications = useMemo(
    () =>
      (notificationsQuery.data ?? []).filter((notification) => {
        const haystack = [
          notification.client_name,
          notification.type,
          notification.title,
          notification.message ?? "",
          notification.severity,
          notification.target_module ?? "",
        ]
          .join(" ")
          .toLowerCase();

        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || notification.status.toLowerCase() === statusFilter;
        const matchesSeverity = severityFilter === "all" || notification.severity.toLowerCase() === severityFilter;
        return matchesQuery && matchesStatus && matchesSeverity;
      }),
    [notificationsQuery.data, query, severityFilter, statusFilter],
  );

  const summary = useMemo(
    () => ({
      open: filteredNotifications.filter((notification) => notification.status.toLowerCase() === "open").length,
      warning: filteredNotifications.filter((notification) => ["warning", "critical"].includes(notification.severity.toLowerCase())).length,
      resolved: filteredNotifications.filter((notification) => notification.status.toLowerCase() === "resolved").length,
    }),
    [filteredNotifications],
  );

  const handleAcknowledge = async (notificationId: string) => {
    try {
      await acknowledgeNotification.mutateAsync(notificationId);
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update notification");
    }
  };

  const handleResolve = async (notificationId: string) => {
    try {
      await resolveNotification.mutateAsync(notificationId);
      toast.success("Notification resolved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve notification");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader
          title="Notifications"
          description="Operational alerts for subscriptions, billing, onboarding delays, and admin follow-ups."
        />

        {notificationsQuery.isLoading ? (
          <AdminLoadingState />
        ) : notificationsQuery.isError ? (
          <AdminTableEmptyState
            title="Could not load notifications"
            description={notificationsQuery.error instanceof Error ? notificationsQuery.error.message : "Admin notifications could not be loaded."}
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <AdminPanelCard title="Open Alerts" description="Items that still need an action.">
                <p className="text-3xl font-semibold text-slate-900">{summary.open}</p>
              </AdminPanelCard>
              <AdminPanelCard title="High Severity" description="Warning and critical alerts needing close review.">
                <p className="text-3xl font-semibold text-slate-900">{summary.warning}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Resolved" description="Operational alerts already cleared.">
                <p className="text-3xl font-semibold text-slate-900">{summary.resolved}</p>
              </AdminPanelCard>
            </div>

            <AdminPanelCard title="Alerts Feed" description="Review, acknowledge, and resolve platform notifications from a single queue.">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by client, type, title, message, or module"
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
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[180px] rounded-2xl">
                      <SelectValue placeholder="Filter severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredNotifications.length ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900">{notification.title}</p>
                            <AdminStatusBadge value={notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)} />
                            <AdminStatusBadge value={notification.status.charAt(0).toUpperCase() + notification.status.slice(1)} />
                          </div>
                          <p className="text-sm text-slate-500">
                            {notification.client_name} - {(notification.target_module ?? "general").replaceAll("_", " ")} - {formatAge(notification.created_at)}
                          </p>
                          {notification.message ? <p className="text-sm text-slate-600">{notification.message}</p> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {notification.status.toLowerCase() === "open" ? (
                          <Button variant="outline" className="rounded-full" onClick={() => handleAcknowledge(notification.id)}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark Read
                          </Button>
                        ) : null}
                        {notification.status.toLowerCase() !== "resolved" ? (
                          <Button className="rounded-full bg-slate-900 hover:bg-slate-800" onClick={() => handleResolve(notification.id)}>
                            Resolve
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminTableEmptyState title="No notifications match this filter" description="Try clearing the filters or review resolved items separately." />
              )}
            </AdminPanelCard>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
