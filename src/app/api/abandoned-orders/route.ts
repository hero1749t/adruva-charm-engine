/**
 * API Route: GET /api/abandoned-orders
 * Returns orders that have been unpaid for longer than threshold (default: 30 minutes)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface AbandonedOrder {
  id: string;
  orderId: string;
  tableNumber: number;
  amount: number;
  customerPhone: string;
  customerEmail?: string;
  timeAgoMinutes: number;
  createdAt: string;
  recovery_status: string;
  recovery_attempts: number;
}

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const minutesThreshold = parseInt(req.nextUrl.searchParams.get("minutesThreshold") || "30");
    const ownerId = req.nextUrl.searchParams.get("ownerId");

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: "ownerId query parameter required" },
        { status: 400 }
      );
    }

    // Validate parameters
    if (minutesThreshold < 5 || minutesThreshold > 1440) {
      return NextResponse.json(
        { success: false, error: "minutesThreshold must be between 5 and 1440 minutes" },
        { status: 400 }
      );
    }

    // Query abandoned orders
    const { data, error } = await supabase
      .from("order_abandonment_tracking")
      .select(
        `
        id,
        order_id,
        owner_id,
        total_amount,
        created_at,
        recovery_status,
        recovery_attempts,
        orders(id, table_number, customer_phone, customer_email)
      `
      )
      .eq("owner_id", ownerId)
      .eq("recovery_status", "active")
      .lt("created_at", `now() - interval '${minutesThreshold} minutes'`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch abandoned orders", details: error.message },
        { status: 500 }
      );
    }

    // Transform data
    const abandonedOrders: AbandonedOrder[] = (data || []).map((record: any) => {
      const createdTime = new Date(record.created_at);
      const nowTime = new Date();
      const diffMs = nowTime.getTime() - createdTime.getTime();
      const timeAgoMinutes = Math.floor(diffMs / (1000 * 60));

      return {
        id: record.id,
        orderId: record.order_id,
        tableNumber: record.orders?.table_number || 0,
        amount: record.total_amount,
        customerPhone: record.orders?.customer_phone || "N/A",
        customerEmail: record.orders?.customer_email,
        timeAgoMinutes,
        createdAt: record.created_at,
        recovery_status: record.recovery_status,
        recovery_attempts: record.recovery_attempts || 0,
      };
    });

    return NextResponse.json({
      success: true,
      abandonedOrders,
      count: abandonedOrders.length,
      threshold: minutesThreshold,
    });
  } catch (error) {
    console.error("Abandoned orders API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
