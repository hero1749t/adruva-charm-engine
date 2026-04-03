import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_QUERY_DEFAULTS } from "@/lib/adminQuery";

export type AdminSupportTicketRow = {
  ticket_id: string;
  ticket_number: string;
  owner_id: string | null;
  client_name: string;
  contact: string;
  subject: string;
  category: string;
  priority: string;
  assigned_agent: string;
  sla_due_at: string | null;
  status: string;
  escalation_level: number;
  created_at: string;
  updated_at: string;
};

export type AdminNotificationRow = {
  id: string;
  owner_id: string | null;
  client_name: string;
  type: string;
  title: string;
  message: string | null;
  severity: string;
  status: string;
  target_module: string | null;
  created_at: string;
};

export type AdminActivityLogRow = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  target: string;
  owner_id: string | null;
  client_name: string;
  ip_device: string;
  result: string;
};

export const useAdminSupportTickets = (ownerId?: string) =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-support-tickets", ownerId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_support_tickets", {
        _owner_id: ownerId ?? null,
      });
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminSupportTicketRow[];
    },
  });

export const useAssignAdminSupportTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      assignedAgentId,
      status,
    }: {
      ticketId: string;
      assignedAgentId?: string | null;
      status?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("assign_admin_support_ticket", {
        _ticket_id: ticketId,
        _assigned_agent_id: assignedAgentId ?? null,
        _status: status ?? null,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      ]);
    },
  });
};

export const useResolveAdminSupportTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status?: string | null }) => {
      const { data, error } = await supabase.rpc("resolve_admin_support_ticket", {
        _ticket_id: ticketId,
        _status: status ?? "resolved",
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      ]);
    },
  });
};

export const useAdminNotifications = () =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_notifications");
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminNotificationRow[];
    },
  });

export const useAcknowledgeAdminNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc("acknowledge_admin_notification", {
        _notification_id: notificationId,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      ]);
    },
  });
};

export const useResolveAdminNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc("resolve_admin_notification", {
        _notification_id: notificationId,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      ]);
    },
  });
};

export const useAdminActivityLogs = (ownerId?: string) =>
  useQuery({
    ...ADMIN_QUERY_DEFAULTS,
    queryKey: ["admin-activity-logs", ownerId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_activity_logs", {
        _owner_id: ownerId ?? null,
      });
      if (error) {
        throw error;
      }
      return (data ?? []) as AdminActivityLogRow[];
    },
  });
