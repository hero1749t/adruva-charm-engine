import { useMemo } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLoadingState, AdminPanelCard, AdminSectionHeader, AdminStatusBadge, AdminTableEmptyState } from "@/components/admin/AdminPrimitives";
import { getRestaurantLogoUrl } from "@/lib/restaurantLogo";
import { formatCurrency } from "@/lib/adminSuperData";
import { type AdminClientDetail, useAdminClientDetail, useAdminClientOutlets, useAdminClientUsers } from "@/hooks/useAdminClients";
import { useAdminInvoices } from "@/hooks/useAdminPayments";
import { useAdminActivityLogs, useAdminSupportTickets } from "@/hooks/useAdminOpsCenter";

const featureLabels: Array<{ key: keyof Pick<AdminClientDetail,
  | "feature_analytics"
  | "feature_inventory"
  | "feature_expenses"
  | "feature_chain"
  | "feature_coupons"
  | "feature_online_orders"
  | "feature_kitchen_display"
  | "feature_customer_reviews"
  | "feature_white_label">; label: string }> = [
  { key: "feature_analytics", label: "Analytics" },
  { key: "feature_inventory", label: "Inventory" },
  { key: "feature_expenses", label: "Expenses" },
  { key: "feature_chain", label: "Multi Outlet" },
  { key: "feature_coupons", label: "Coupons" },
  { key: "feature_online_orders", label: "QR Ordering" },
  { key: "feature_kitchen_display", label: "Kitchen Display" },
  { key: "feature_customer_reviews", label: "Feedback" },
  { key: "feature_white_label", label: "Custom Branding" },
];

const AdminOwnerDetail = () => {
  const { ownerId } = useParams();
  const detailQuery = useAdminClientDetail(ownerId);
  const outletsQuery = useAdminClientOutlets(ownerId);
  const usersQuery = useAdminClientUsers(ownerId);
  const invoicesQuery = useAdminInvoices();
  const supportTicketsQuery = useAdminSupportTickets(ownerId);
  const activityQuery = useAdminActivityLogs(ownerId);

  const detail = detailQuery.data;
  const featureEntries = useMemo(
    () => (detail ? featureLabels.map((feature) => ({ label: feature.label, enabled: Boolean(detail[feature.key]) })) : []),
    [detail],
  );
  const clientInvoices = useMemo(
    () => (invoicesQuery.data ?? []).filter((invoice) => invoice.owner_id === ownerId),
    [invoicesQuery.data, ownerId],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {detailQuery.isLoading ? (
          <AdminLoadingState />
        ) : detail ? (
          <>
            <AdminSectionHeader
              title={detail.client_name}
              description={`${detail.owner_name} | ${detail.contact}${detail.phone ? ` | ${detail.phone}` : ""}`}
              action={<AdminStatusBadge value={detail.subscription_status === "trial" ? "Trial" : "Active"} />}
            />

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex h-auto flex-wrap justify-start rounded-2xl bg-white p-1">
                {["overview", "outlets", "subscription", "payments", "modules", "users", "support", "activity"].map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="rounded-xl capitalize">{tab}</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="grid gap-6 lg:grid-cols-3">
                <AdminPanelCard title="Client Snapshot" description="Real profile and subscription summary.">
                  <div className="mb-4 flex items-center gap-3">
                    {detail.restaurant_logo_url ? (
                      <img
                        src={getRestaurantLogoUrl(detail.restaurant_logo_url) ?? undefined}
                        alt={detail.client_name}
                        className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 font-semibold text-orange-700">
                        {detail.client_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{detail.client_name}</p>
                      <p className="text-sm text-slate-500">{detail.address ?? "Address not added yet"}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Plan</span><span className="font-medium text-slate-900">{detail.plan_name}</span></div>
                    <div className="flex justify-between"><span>Monthly Revenue</span><span className="font-medium text-slate-900">{formatCurrency(detail.monthly_revenue)}</span></div>
                    <div className="flex justify-between"><span>Outlets</span><span className="font-medium text-slate-900">{detail.outlets_count}</span></div>
                    <div className="flex justify-between"><span>Total Orders</span><span className="font-medium text-slate-900">{detail.total_orders}</span></div>
                    <div className="flex justify-between"><span>Subscription Expiry</span><span className="font-medium text-slate-900">{detail.subscription_expiry ? new Date(detail.subscription_expiry).toLocaleDateString() : "Not set"}</span></div>
                  </div>
                </AdminPanelCard>

                <AdminPanelCard title="Operational Health" description="Live branch, staff, and setup counts.">
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Outlets</span><span className="font-medium text-slate-900">{detail.outlets_count}</span></div>
                    <div className="flex justify-between"><span>Tables</span><span className="font-medium text-slate-900">{detail.tables_count}</span></div>
                    <div className="flex justify-between"><span>Rooms</span><span className="font-medium text-slate-900">{detail.rooms_count}</span></div>
                    <div className="flex justify-between"><span>Staff Accounts</span><span className="font-medium text-slate-900">{detail.staff_count}</span></div>
                    <div className="flex justify-between"><span>Owner Email</span><span className="font-medium text-slate-900">{detail.contact}</span></div>
                  </div>
                </AdminPanelCard>

                <AdminPanelCard title="Quick Actions" description="Phase 2 still keeps action surface controlled and safe.">
                  <div className="grid gap-2">
                    {["Upgrade plan", "Extend renewal date", "Open outlet health review", "Inspect staff access"].map((action) => (
                      <div key={action} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{action}</div>
                    ))}
                  </div>
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="outlets">
                <AdminPanelCard title="Outlets" description="Real outlets linked to this client in Supabase.">
                  {outletsQuery.isLoading ? (
                    <AdminLoadingState />
                  ) : outletsQuery.data?.length ? (
                    <div className="space-y-3">
                      {outletsQuery.data.map((outlet) => (
                        <div key={outlet.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{outlet.name}</p>
                            <p className="text-sm text-slate-500">{outlet.address ?? "Address missing"} | {outlet.manager_name ?? "Manager not assigned"}</p>
                          </div>
                          <div className="flex gap-2">
                            <AdminStatusBadge value={outlet.is_active ? "Active" : "Paused"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminTableEmptyState title="No outlets found" description="This client does not have any linked branches in the current schema." />
                  )}
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="subscription">
                <AdminPanelCard title="Subscription" description="Real plan and renewal data from owner subscriptions.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Current Plan</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{detail.plan_name}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Billing cycle: {detail.billing_period ?? "Not set"} | Renewal: {detail.subscription_expiry ? new Date(detail.subscription_expiry).toLocaleDateString() : "Not set"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Subscription Status</p>
                      <div className="mt-2">
                        <AdminStatusBadge value={detail.subscription_status === "trial" ? "Trial" : "Active"} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">Plan reassignment and renewal controls are available from the main Subscriptions & Plans queue.</p>
                    </div>
                  </div>
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="payments">
                <AdminPanelCard title="Payments" description="Client-level invoice ledger from the admin billing module.">
                  {invoicesQuery.isLoading ? (
                    <AdminLoadingState />
                  ) : clientInvoices.length ? (
                    <div className="space-y-3">
                      {clientInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                            <p className="text-sm text-slate-500">
                              {invoice.plan_name} - {formatCurrency(invoice.total)} - {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "No due date"}
                            </p>
                          </div>
                          <AdminStatusBadge value={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminTableEmptyState title="No invoices yet" description="This client does not yet have entries in the admin billing ledger." />
                  )}
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="modules">
                <AdminPanelCard title="Enabled Modules" description="Live feature access derived from the client’s subscribed plan.">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {featureEntries.map((feature) => (
                      <div key={feature.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-medium text-slate-900">{feature.label}</p>
                        <div className="mt-3">
                          <AdminStatusBadge value={feature.enabled ? "Active" : "Paused"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="users">
                <AdminPanelCard title="Users" description="Owner and staff records currently linked to this client.">
                  {usersQuery.isLoading ? (
                    <AdminLoadingState />
                  ) : usersQuery.data?.length ? (
                    <div className="space-y-3">
                      {usersQuery.data.map((user) => (
                        <div key={`${user.source}-${user.user_id}-${user.role}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email ?? "No email"} | {user.phone ?? "No phone"} | {user.source}</p>
                          </div>
                          <div className="flex gap-2">
                            <AdminStatusBadge value={user.role === "owner" ? "Active" : user.role} />
                            <AdminStatusBadge value={user.is_active ? "Active" : "Paused"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminTableEmptyState title="No users found" description="No owner/staff records were returned for this client." />
                  )}
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="support">
                <AdminPanelCard title="Support" description="Support queue linked to this client.">
                  {supportTicketsQuery.isLoading ? (
                    <AdminLoadingState />
                  ) : supportTicketsQuery.data?.length ? (
                    <div className="space-y-3">
                      {supportTicketsQuery.data.map((ticket) => (
                        <div key={ticket.ticket_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{ticket.subject}</p>
                              <p className="text-sm text-slate-500">{ticket.ticket_number} - {ticket.category} - {ticket.assigned_agent}</p>
                            </div>
                            <div className="flex gap-2">
                              <AdminStatusBadge value={ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} />
                              <AdminStatusBadge value={ticket.status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminTableEmptyState title="No support tickets" description="No support items are currently linked to this client." />
                  )}
                </AdminPanelCard>
              </TabsContent>

              <TabsContent value="activity">
                <AdminPanelCard title="Activity" description="Recent admin actions tied to this client account.">
                  {activityQuery.isLoading ? (
                    <AdminLoadingState />
                  ) : activityQuery.data?.length ? (
                    <div className="space-y-3">
                      {activityQuery.data.slice(0, 8).map((log) => (
                        <div key={log.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{log.action}</p>
                              <p className="text-sm text-slate-500">{log.user} - {log.module} - {new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <AdminStatusBadge value={log.result} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminTableEmptyState title="No activity logs yet" description="Admin actions for this client will appear here as the new ops layer is used." />
                  )}
                </AdminPanelCard>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <AdminTableEmptyState title="Client not found" description="This client record could not be loaded from the admin RPC." />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOwnerDetail;
