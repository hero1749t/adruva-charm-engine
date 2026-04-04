/**
 * API Route: POST /api/abandoned-orders/[id]/void
 * Marks an abandoned order as void (no longer pursuing recovery)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface VoidResponse {
  success: boolean;
  message: string;
  voidReason?: string;
  error?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<VoidResponse>> {
  try {
    const abandonmentId = params.id;
    const body = await req.json();
    const { ownerId, reason = "No recovery attempted" } = body;

    if (!abandonmentId) {
      return NextResponse.json(
        { success: false, error: "Abandonment ID required", message: "" },
        { status: 400 }
      );
    }

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: "Owner ID required", message: "" },
        { status: 400 }
      );
    }

    // Validate reason length
    if (reason && reason.length > 500) {
      return NextResponse.json(
        { success: false, error: "Reason too long (max 500 characters)", message: "" },
        { status: 400 }
      );
    }

    // Get the abandonment record
    const { data: abandonmentRecord, error: fetchError } = await supabase
      .from("order_abandonment_tracking")
      .select("*")
      .eq("id", abandonmentId)
      .eq("owner_id", ownerId)
      .single();

    if (fetchError || !abandonmentRecord) {
      return NextResponse.json(
        { success: false, error: "Abandonment record not found", message: "" },
        { status: 404 }
      );
    }

    // Update status to voided
    const { error: updateError } = await supabase
      .from("order_abandonment_tracking")
      .update({
        recovery_status: "voided",
        void_reason: reason,
        voided_at: new Date().toISOString(),
      })
      .eq("id", abandonmentId);

    if (updateError) {
      console.error("Error updating abandonment record:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to void abandonment", message: "" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Abandonment voided successfully",
      voidReason: reason,
    });
  } catch (error) {
    console.error("Void API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
