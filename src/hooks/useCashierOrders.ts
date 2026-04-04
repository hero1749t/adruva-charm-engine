import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type PaymentEntry = Database["public"]["Tables"]["order_payment_entries"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type MenuCategory = Database["public"]["Tables"]["menu_categories"]["Row"];
type RestaurantTable = Database["public"]["Tables"]["restaurant_tables"]["Row"];

export type CashierOrder = OrderRow & { order_items: OrderItem[]; order_payment_entries: PaymentEntry[] };
export type CashierOrdersFilter = "billing" | "active" | "all";
export type PaymentMethod = "cash" | "upi" | "card";

export type ManualCounterOrderLineInput = {
  menuItemId: string;
  quantity: number;
};

type ManualCounterOrderInput = {
  tableId: string;
  customerPhone?: string;
  notes?: string;
  items: ManualCounterOrderLineInput[];
};

type RecordManualPaymentInput = {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentReference?: string | null;
  billingNote?: string | null;
};

type BillingCorrectionInput = {
  orderId: string;
  reason: string;
};

type CancelOrderInput = {
  orderId: string;
  reason: string;
};

type CashierOrdersSnapshot = Array<[readonly unknown[], CashierOrder[] | undefined]>;

const cashierOrdersKey = (ownerId: string | null | undefined, filter: CashierOrdersFilter) =>
  ["cashier-orders", ownerId, filter] as const;

const cashierMenuDataKey = (ownerId: string | null | undefined) => ["cashier-menu-data", ownerId] as const;

const normalizeOrders = (orders: CashierOrder[]) =>
  [...orders].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

const getPaidAmount = (order: CashierOrder) =>
  (order.order_payment_entries ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0);

const shouldIncludeOrderForFilter = (order: CashierOrder, filter: CashierOrdersFilter) => {
  if (filter === "billing") {
    return (
      order.order_origin === "counter" ||
      ["partial", "confirmed"].includes(order.payment_status) ||
      ["ready", "served"].includes(order.status)
    );
  }

  if (filter === "active") {
    return ["new", "accepted", "preparing", "ready"].includes(order.status);
  }

  return true;
};

const fetchCashierOrders = async (ownerId: string, filter: CashierOrdersFilter) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_payment_entries(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const orders = ((data ?? []) as CashierOrder[]).filter((order) => shouldIncludeOrderForFilter(order, filter));
  return normalizeOrders(orders);
};

const fetchCashierMenuData = async (ownerId: string) => {
  const [tablesResponse, categoriesResponse, itemsResponse] = await Promise.all([
    supabase
      .from("restaurant_tables")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_active", true)
      .order("table_number"),
    supabase
      .from("menu_categories")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_available", true)
      .order("sort_order"),
  ]);

  if (tablesResponse.error) throw tablesResponse.error;
  if (categoriesResponse.error) throw categoriesResponse.error;
  if (itemsResponse.error) throw itemsResponse.error;

  return {
    freeTables: ((tablesResponse.data ?? []) as RestaurantTable[]).filter((table) => table.status === "free"),
    categories: (categoriesResponse.data ?? []) as MenuCategory[],
    items: (itemsResponse.data ?? []) as MenuItem[],
  };
};

const rollbackSnapshots = (queryClient: ReturnType<typeof useQueryClient>, snapshots?: CashierOrdersSnapshot) => {
  if (!snapshots) return;
  snapshots.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
};

const useOptimisticCashierMutation = <TInput,>(
  ownerId: string | null | undefined,
  applyPatch: (orders: CashierOrder[] | undefined, input: TInput) => CashierOrder[] | undefined,
  mutationFn: (input: TInput) => Promise<unknown>,
  afterSuccess?: () => Promise<unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (input) => {
      if (!ownerId) return { snapshots: [] as CashierOrdersSnapshot };

      await queryClient.cancelQueries({ queryKey: ["cashier-orders", ownerId] });

      const snapshots = queryClient.getQueriesData<CashierOrder[]>({
        queryKey: ["cashier-orders", ownerId],
      });

      snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, applyPatch(data, input));
      });

      return { snapshots };
    },
    onError: (_error, _input, context) => {
      rollbackSnapshots(queryClient, context?.snapshots);
    },
    onSuccess: async () => {
      if (afterSuccess) {
        await afterSuccess();
      }
    },
    onSettled: async () => {
      if (!ownerId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cashier-orders", ownerId] }),
        queryClient.invalidateQueries({ queryKey: cashierMenuDataKey(ownerId) }),
      ]);
    },
  });
};

export const useCashierMenuData = (ownerId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: cashierMenuDataKey(ownerId),
    enabled: Boolean(ownerId),
    queryFn: async () => fetchCashierMenuData(ownerId!),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!ownerId) return;

    const channel = supabase
      .channel(`cashier-menu-data-${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables", filter: `owner_id=eq.${ownerId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: cashierMenuDataKey(ownerId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories", filter: `owner_id=eq.${ownerId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: cashierMenuDataKey(ownerId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `owner_id=eq.${ownerId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: cashierMenuDataKey(ownerId) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, queryClient]);

  return {
    ...query,
    freeTables: query.data?.freeTables ?? [],
    categories: query.data?.categories ?? [],
    items: query.data?.items ?? [],
  };
};

export const useCashierOrders = (ownerId: string | null | undefined, filter: CashierOrdersFilter) => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: cashierOrdersKey(ownerId, filter),
    enabled: Boolean(ownerId),
    queryFn: async () => fetchCashierOrders(ownerId!, filter),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!ownerId) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["cashier-orders", ownerId] });
    };

    const channel = supabase
      .channel(`cashier-orders-${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${ownerId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `owner_id=eq.${ownerId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_payment_entries", filter: `owner_id=eq.${ownerId}` }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, queryClient]);

  const createManualOrderMutation = useMutation({
    mutationFn: async (input: ManualCounterOrderInput) => {
      if (!ownerId) {
        throw new Error("Owner context missing");
      }

      const payload = input.items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.rpc("create_manual_counter_order", {
        _owner_id: ownerId,
        _table_id: input.tableId,
        _customer_phone: input.customerPhone?.trim() ?? "",
        _notes: input.notes?.trim() ?? "",
        _items: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      if (!ownerId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cashier-orders", ownerId] }),
        queryClient.invalidateQueries({ queryKey: cashierMenuDataKey(ownerId) }),
      ]);
    },
  });

  const recordManualPaymentMutation = useOptimisticCashierMutation(
    ownerId,
    (orders, input: RecordManualPaymentInput) => {
      if (!orders) return orders;

      const now = new Date().toISOString();

      return normalizeOrders(
        orders
          .map((order) => {
            if (order.id !== input.orderId) return order;

            const optimisticEntry: PaymentEntry = {
              id: `temp-${now}`,
              order_id: order.id,
              owner_id: order.owner_id,
              staff_member_id: null,
              source: "manual",
              payment_method: input.paymentMethod,
              amount: input.amount,
              reference: input.paymentReference?.trim() || null,
              note: input.billingNote?.trim() || null,
              gateway_payload: {},
              created_at: now,
            };

            const orderPaymentEntries = [...(order.order_payment_entries ?? []), optimisticEntry];
            const paidAmount = getPaidAmount({ ...order, order_payment_entries: orderPaymentEntries });
            const isClosed = Math.abs(paidAmount - Number(order.total_amount)) < 0.001;
            const methods = Array.from(new Set(orderPaymentEntries.map((entry) => entry.payment_method)));

            return {
              ...order,
              order_payment_entries: orderPaymentEntries,
              payment_status: isClosed ? "confirmed" : "partial",
              bill_status: isClosed ? "generated" : "draft",
              payment_method: isClosed ? (methods.length === 1 ? methods[0] : "split") : null,
              payment_reference: isClosed ? input.paymentReference?.trim() || null : null,
              payment_confirmed_at: isClosed ? now : order.payment_confirmed_at,
              status: isClosed ? "served" : order.status,
            };
          })
          .filter((order) => shouldIncludeOrderForFilter(order, filter)),
      );
    },
    async (input: RecordManualPaymentInput) => {
      const { data, error } = await supabase.rpc("record_manual_order_payment", {
        _order_id: input.orderId,
        _payment_method: input.paymentMethod,
        _amount: input.amount,
        _payment_reference: input.paymentReference?.trim() || null,
        _billing_note: input.billingNote?.trim() || null,
      });

      if (error) throw error;
      return data;
    },
  );

  const reopenBillMutation = useOptimisticCashierMutation(
    ownerId,
    (orders, input: BillingCorrectionInput) => {
      if (!orders) return orders;
      return normalizeOrders(
        orders
          .map((order) =>
            order.id === input.orderId
              ? {
                  ...order,
                  payment_status: "pending",
                  payment_method: null,
                  payment_reference: null,
                  payment_confirmed_at: null,
                  bill_status: "reverted",
                  bill_generated_at: null,
                  bill_number: null,
                  billing_reverted_at: new Date().toISOString(),
                  billing_revert_reason: input.reason,
                  status: "ready",
                }
              : order,
          )
          .filter((order) => shouldIncludeOrderForFilter(order, filter)),
      );
    },
    async (input: BillingCorrectionInput) => {
      const { data, error } = await supabase.rpc("revert_order_payment", {
        _order_id: input.orderId,
        _reason: input.reason,
      });

      if (error) throw error;
      return data;
    },
  );

  const voidBillMutation = useOptimisticCashierMutation(
    ownerId,
    (orders, input: BillingCorrectionInput) => {
      if (!orders) return orders;
      return normalizeOrders(
        orders
          .map((order) =>
            order.id === input.orderId
              ? {
                  ...order,
                  payment_status: "voided",
                  payment_method: null,
                  payment_reference: null,
                  bill_status: "voided",
                  billing_voided_at: new Date().toISOString(),
                  billing_void_reason: input.reason,
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                  cancellation_reason: input.reason,
                }
              : order,
          )
          .filter((order) => shouldIncludeOrderForFilter(order, filter)),
      );
    },
    async (input: BillingCorrectionInput) => {
      const { data, error } = await supabase.rpc("void_order_billing", {
        _order_id: input.orderId,
        _reason: input.reason,
      });

      if (error) throw error;
      return data;
    },
  );

  const cancelOrderMutation = useOptimisticCashierMutation(
    ownerId,
    (orders, input: CancelOrderInput) => {
      if (!orders) return orders;
      return normalizeOrders(
        orders
          .map((order) =>
            order.id === input.orderId
              ? {
                  ...order,
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                  cancellation_reason: input.reason,
                }
              : order,
          )
          .filter((order) => shouldIncludeOrderForFilter(order, filter)),
      );
    },
    async (input: CancelOrderInput) => {
      const { data, error } = await supabase.rpc("cancel_order_with_reason", {
        _order_id: input.orderId,
        _reason: input.reason,
      });

      if (error) throw error;
      return data;
    },
  );

  return {
    ...ordersQuery,
    orders: ordersQuery.data ?? [],
    refetchOrders: ordersQuery.refetch,
    createManualOrderMutation,
    recordManualPaymentMutation,
    reopenBillMutation,
    voidBillMutation,
    cancelOrderMutation,
  };
};
