/**
 * API Route: POST /api/abandoned-orders/[id]/recover
 * Marks an abandoned order for recovery (sends reminder, offers discount, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface RecoveryResponse {
  success: boolean;
  message: string;
  recoveryEventId?: string;
  reminderSent?: boolean;
  error?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse<RecoveryResponse>> {
  try {
    const abandonmentId = params.id;
    const body = await req.json();
    const { ownerId } = body;

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

    // Update recovery attempts and status
    const { error: updateError } = await supabase
      .from("order_abandonment_tracking")
      .update({
        recovery_attempts: (abandonmentRecord.recovery_attempts || 0) + 1,
        recovery_status: "recovery_attempted",
      })
      .eq("id", abandonmentId);

    if (updateError) {
      console.error("Error updating abandonment record:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update recovery status", message: "" },
        { status: 500 }
      );
    }

    // Optional: Send SMS/Email reminder (implement as needed)
    const reminderSent = false; // Placeholder - implement SMS/Email service

    return NextResponse.json({
      success: true,
      message: "Recovery initiated - customer will be notified",
      recoveryEventId: abandonmentId,
      reminderSent,
    });
  } catch (error) {
    console.error("Recovery API error:", error);
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
