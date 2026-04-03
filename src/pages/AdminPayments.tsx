import { useMemo, useState } from "react";
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
  type AdminInvoiceRow,
  useAdminInvoices,
  useMarkAdminInvoicePaid,
  useRefundAdminInvoice,
  useResendAdminInvoice,
} from "@/hooks/useAdminPayments";
import { formatCurrency } from "@/lib/adminSuperData";

type RefundDraft = {
  id: string;
  invoiceNumber: string;
  notes: string;
};

const AdminPayments = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refundDraft, setRefundDraft] = useState<RefundDraft | null>(null);

  const { data: invoices = [], isLoading, isError, error } = useAdminInvoices();
  const markPaid = useMarkAdminInvoicePaid();
  const resendInvoice = useResendAdminInvoice();
  const refundInvoice = useRefundAdminInvoice();

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        const haystack = [invoice.invoice_number, invoice.client_name, invoice.contact, invoice.plan_name, invoice.payment_method ?? ""]
          .join(" ")
          .toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());
        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [invoices, query, statusFilter],
  );

  const summary = useMemo(
    () => ({
      paid: invoices.filter((invoice) => invoice.status === "paid").length,
      pending: invoices.filter((invoice) => invoice.status === "pending").length,
      failed: invoices.filter((invoice) => invoice.status === "failed").length,
      overdueAmount: invoices
        .filter((invoice) => invoice.status === "failed" || invoice.status === "pending")
        .reduce((sum, invoice) => sum + invoice.total, 0),
    }),
    [invoices],
  );

  const handleMarkPaid = async (invoice: AdminInvoiceRow) => {
    try {
      await markPaid.mutateAsync({
        invoiceId: invoice.id,
        paymentMethod: invoice.payment_method ?? "manual",
      });
      toast.success(`Invoice ${invoice.invoice_number} marked paid`);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Failed to mark invoice paid");
    }
  };

  const handleResend = async (invoice: AdminInvoiceRow) => {
    try {
      await resendInvoice.mutateAsync(invoice.id);
      toast.success(`Invoice ${invoice.invoice_number} marked as resent`);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Failed to resend invoice");
    }
  };

  const handleRefund = async () => {
    if (!refundDraft) return;

    try {
      await refundInvoice.mutateAsync({
        invoiceId: refundDraft.id,
        notes: refundDraft.notes,
      });
      toast.success(`Invoice ${refundDraft.invoiceNumber} refunded`);
      setRefundDraft(null);
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Failed to refund invoice");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminSectionHeader title="Payments & Invoices" description="Manage real invoice ledger records, payment recovery, refunds, and collection workflows." />

        {isLoading ? (
          <AdminLoadingState />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminPanelCard title="Paid Invoices" description="Invoices completed successfully.">
                <p className="text-3xl font-semibold text-slate-900">{summary.paid}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Pending Invoices" description="Awaiting payment confirmation.">
                <p className="text-3xl font-semibold text-slate-900">{summary.pending}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Failed / Escalated" description="Need finance follow-up.">
                <p className="text-3xl font-semibold text-slate-900">{summary.failed}</p>
              </AdminPanelCard>
              <AdminPanelCard title="Open Collections" description="Outstanding invoice value.">
                <p className="text-3xl font-semibold text-slate-900">{formatCurrency(summary.overdueAmount)}</p>
              </AdminPanelCard>
            </div>

            <AdminPanelCard title="Invoice Ledger" description="Real billing records seeded from current subscription state and maintained by admin actions.">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search invoice, client, contact, or plan"
                  className="max-w-md rounded-2xl"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] rounded-2xl">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isError ? (
                <AdminTableEmptyState
                  title="Could not load invoices"
                  description={error instanceof Error ? error.message : "An unexpected error occurred while loading invoices."}
                />
              ) : filteredInvoices.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                              <p className="text-xs text-slate-500">{invoice.last_sent_at ? `Last sent ${new Date(invoice.last_sent_at).toLocaleString()}` : "Never sent"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-slate-900">{invoice.client_name}</p>
                              <p className="text-xs text-slate-500">{invoice.contact}</p>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.plan_name}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>{formatCurrency(invoice.tax)}</TableCell>
                          <TableCell>{formatCurrency(invoice.total)}</TableCell>
                          <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "Not set"}</TableCell>
                          <TableCell>{invoice.payment_method ?? "Not set"}</TableCell>
                          <TableCell><AdminStatusBadge value={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleResend(invoice)} disabled={resendInvoice.isPending}>
                                Resend
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleMarkPaid(invoice)}
                                disabled={markPaid.isPending || invoice.status === "paid" || invoice.status === "refunded"}
                              >
                                Mark Paid
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => setRefundDraft({ id: invoice.id, invoiceNumber: invoice.invoice_number, notes: invoice.notes ?? "" })}
                                disabled={invoice.status === "refunded" || refundInvoice.isPending}
                              >
                                Refund
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => toast.message(invoice.pdf_url ? "PDF URL is stored on this invoice and can be opened when document generation is wired." : "PDF generation is the next billing sub-phase.")}
                              >
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <AdminTableEmptyState title="No invoices match this filter" description="Try a different search or clear the selected status filter." />
              )}
            </AdminPanelCard>
          </>
        )}
      </div>

      <Dialog open={Boolean(refundDraft)} onOpenChange={(open) => !open && setRefundDraft(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Refund invoice</DialogTitle>
            <DialogDescription>
              Mark the invoice as refunded and capture an internal finance note.
            </DialogDescription>
          </DialogHeader>

          {refundDraft ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Refunding <span className="font-semibold text-slate-900">{refundDraft.invoiceNumber}</span>
              </div>
              <Textarea
                value={refundDraft.notes}
                onChange={(event) => setRefundDraft((current) => current ? { ...current, notes: event.target.value } : current)}
                className="min-h-[120px] rounded-2xl"
                placeholder="Add refund reason, payment reference, or finance note"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setRefundDraft(null)}>
              Cancel
            </Button>
            <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={handleRefund} disabled={refundInvoice.isPending}>
              {refundInvoice.isPending ? "Saving..." : "Confirm refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPayments;
