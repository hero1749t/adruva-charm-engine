import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_QUERY_DEFAULTS } from "@/lib/adminQuery";

export type AdminInvoiceRow = {
  id: string;
  invoice_number: string;
  owner_id: string;
  client_name: string;
  contact: string;
  plan_name: string;
  amount: number;
  tax: number;
  total: number;
  due_date: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  pdf_url: string | null;
  last_sent_at: string | null;
  created_at: string;
};

export type AdminWastageReportRow = {
  id: string;
  order_id: string;
  owner_id: string;
  client_name: string;
  table_number: number | null;
  cancellation_reason: string;
  authorised_by: string;
  estimated_loss_amount: number;
  credit_note_number: string | null;
  invoice_number: string | null;
  created_at: string;
};

export type AdminBillingDiscrepancyRow = {
  order_id: string;
  owner_id: string;
  client_name: string;
  table_number: number | null;
  order_origin: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  last_payment_at: string | null;
};

export const useAdminInvoices = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_invoices");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminInvoiceRow[];
    },
  });

export const useAdminWastageReport = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-wastage-report"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_wastage_report");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminWastageReportRow[];
    },
  });

export const useAdminBillingDiscrepancies = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-billing-discrepancies"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_billing_discrepancies");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminBillingDiscrepancyRow[];
    },
  });

export const useMarkAdminInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, paymentMethod }: { invoiceId: string; paymentMethod?: string }) => {
      const { data, error } = await supabase.rpc("mark_admin_invoice_paid", {
        _invoice_id: invoiceId,
        _payment_method: paymentMethod ?? "manual",
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
      ]);
    },
  });
};

export const useRefundAdminInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, notes }: { invoiceId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc("refund_admin_invoice", {
        _invoice_id: invoiceId,
        _notes: notes?.trim() ? notes.trim() : null,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
      ]);
    },
  });
};

export const useResendAdminInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.rpc("resend_admin_invoice", {
        _invoice_id: invoiceId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
      ]);
    },
  });
};
