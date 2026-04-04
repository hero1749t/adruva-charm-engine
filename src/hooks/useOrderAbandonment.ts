/**
 * Hook: useOrderAbandonment
 * Tracks and retrieves abandoned orders for owners
 * 
 * Features:
 * - Fetches orders unpaid for > threshold minutes
 * - Auto-refetch every 5 minutes
 * - Methods to mark as recovered or void
 * - Error handling with fallback to empty array
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface AbandonedOrder {
  id: string;
  orderId: string;
  tableNumber: number;
  amount: number;
  customerPhone?: string;
  customerEmail?: string;
  timeAgoMinutes: number;
  createdAt: string;
  recovery_status: string;
  recovery_attempts: number;
}

interface FetchAbandonedOrdersResponse {
  success: boolean;
  abandonedOrders: AbandonedOrder[];
  count: number;
  threshold: number;
  error?: string;
}

interface RecoveryResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export function useOrderAbandonment(minutesThreshold: number = 30) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Parse user ID from userx object
  const userId = user?.id || (typeof user === "object" && (user as any)?.user_id);

  // ✅ Query: Fetch abandoned orders
  const { data: response, isLoading, error } = useQuery({
    queryKey: ["abandoned-orders", minutesThreshold, userId],
    queryFn: async (): Promise<FetchAbandonedOrdersResponse> => {
      if (!userId) {
        return { success: false, abandonedOrders: [], count: 0, threshold: minutesThreshold };
      }

      try {
        const url = new URL("/api/abandoned-orders", window.location.origin);
        url.searchParams.append("minutesThreshold", minutesThreshold.toString());
        url.searchParams.append("ownerId", userId);

        const resp = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!resp.ok) {
          console.warn(`[useOrderAbandonment] API error: ${resp.status}`);
          return { success: false, abandonedOrders: [], count: 0, threshold: minutesThreshold };
        }

        const data = await resp.json();
        return data as FetchAbandonedOrdersResponse;
      } catch (err) {
        console.error("[useOrderAbandonment] Fetch error:", err);
        return { success: false, abandonedOrders: [], count: 0, threshold: minutesThreshold };
      }
    },
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    enabled: !!userId,
    retry: 2, // Retry failed requests
    staleTime: 2 * 60 * 1000, // Data considered fresh for 2 minutes
  });

  const abandonedOrders = response?.abandonedOrders || [];

  // ✅ Mutation: Mark order as recovered (send reminder, etc.)
  const markAsRecoveredMutation = useMutation({
    mutationFn: async (abandonmentId: string): Promise<RecoveryResponse> => {
      const resp = await fetch(`/api/abandoned-orders/${abandonmentId}/recover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ownerId: userId }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.message || "Failed to mark as recovered");
      }

      return resp.json();
    },
    onSuccess: () => {
      // Invalidate abandoned orders query to refresh
      queryClient.invalidateQueries({ queryKey: ["abandoned-orders"] });
    },
    onError: (error) => {
      console.error("[useOrderAbandonment] Recovery error:", error);
    },
  });

  // ✅ Mutation: Void abandoned order
  const voidAbandonedOrderMutation = useMutation({
    mutationFn: async (input: { abandonmentId: string; reason: string }): Promise<RecoveryResponse> => {
      const resp = await fetch(`/api/abandoned-orders/${input.abandonmentId}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: userId,
          reason: input.reason,
        }),
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.message || "Failed to void abandoned order");
      }

      return resp.json();
    },
    onSuccess: () => {
      // Invalidate abandoned orders query to refresh
      queryClient.invalidateQueries({ queryKey: ["abandoned-orders"] });
    },
    onError: (error) => {
      console.error("[useOrderAbandonment] Void error:", error);
    },
  });

  // Helper functions
  const markAsRecovered = (abandonmentId: string) => {
    return markAsRecoveredMutation.mutate(abandonmentId);
  };

  const voidAbandonedOrder = (abandonmentId: string, reason: string) => {
    return voidAbandonedOrderMutation.mutate({ abandonmentId, reason });
  };

  return {
    // Data
    abandonedOrders,
    unrecoveredCount: abandonedOrders.length,
    totalAmount: abandonedOrders.reduce((sum, order) => sum + order.amount, 0),

    // Loading states
    isLoading,
    isRecovering: markAsRecoveredMutation.isPending,
    isVoiding: voidAbandonedOrderMutation.isPending,

    // Error states
    error: error ? (error as Error).message : null,
    recoveryError: markAsRecoveredMutation.error ? (markAsRecoveredMutation.error as Error).message : null,
    voidError: voidAbandonedOrderMutation.error ? (voidAbandonedOrderMutation.error as Error).message : null,

    // Methods
    markAsRecovered,
    voidAbandonedOrder,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["abandoned-orders"] }),
  };
}
