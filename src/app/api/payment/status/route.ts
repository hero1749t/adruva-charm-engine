/**
 * API Route: POST /api/payment/status
 * Returns the status of a payment (completed, pending, failed, expired)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface PaymentStatusResponse {
  success: boolean;
  status: "completed" | "pending" | "failed" | "expired" | "invalid";
  paidAt?: string;
  paymentId?: string;
  gateway?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<PaymentStatusResponse>> {
  try {
    const body = await req.json();
    const { paymentUrl, paymentId, orderId } = body;

    // Validate input
    if (!paymentUrl && !paymentId && !orderId) {
      return NextResponse.json(
        {
          success: false,
          status: "invalid",
          error: "Must provide paymentUrl, paymentId, or orderId",
        },
        { status: 400 }
      );
    }

    // Step 1: Look up payment link in database
    let query = supabase.from("payment_link_tokens").select("*");

    if (paymentId) {
      query = query.eq("id", paymentId);
    } else if (orderId) {
      query = query.eq("order_id", orderId);
    } else if (paymentUrl) {
      query = query.eq("payment_link", paymentUrl);
    }

    const { data: paymentRecord, error: dbError } = await query.single();

    if (dbError || !paymentRecord) {
      return NextResponse.json(
        {
          success: false,
          status: "invalid",
          error: "Payment record not found",
        },
        { status: 404 }
      );
    }

    // Step 2: Check DB status first (fastest)
    if (paymentRecord.status === "completed" && paymentRecord.webhook_received_at) {
      return NextResponse.json({
        success: true,
        status: "completed",
        paidAt: paymentRecord.webhook_received_at,
        paymentId: paymentRecord.id,
        gateway: paymentRecord.gateway,
      });
    }

    // Step 3: If not completed, check expiry
    const expiresAt = new Date(paymentRecord.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json({
        success: true,
        status: "expired",
        paymentId: paymentRecord.id,
        gateway: paymentRecord.gateway,
      });
    }

    // Step 4: If still pending, optionally check with gateway (requires API keys)
    // For now, we'll assume "pending" - in production, call Razorpay/PhonePe API
    // const gatewayStatus = await checkGatewayStatus(paymentRecord.gateway, paymentRecord.payment_token);

    return NextResponse.json({
      success: true,
      status: "pending",
      paymentId: paymentRecord.id,
      gateway: paymentRecord.gateway,
    });
  } catch (error) {
    console.error("Payment status API error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "invalid",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Optional: Check status with payment gateway
async function checkGatewayStatus(
  gateway: string,
  paymentToken: string
): Promise<"completed" | "pending" | "failed"> {
  try {
    if (gateway === "razorpay") {
      // Check Razorpay status
      const auth = Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString("base64");

      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentToken}`, {
        headers: { Authorization: `Basic ${auth}` },
      });

      const data = (await response.json()) as any;
      if (data.status === "captured") return "completed";
      if (data.status === "created") return "pending";
      return "failed";
    }

    if (gateway === "phonepe") {
      // Check PhonePe status (simplified - actual implementation varies)
      const response = await fetch("https://api.phonepe.com/apis/hermes/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.PHONEPE_API_KEY || "",
        },
        body: JSON.stringify({ merchantTransactionId: paymentToken }),
      });

      const data = (await response.json()) as any;
      if (data.success) return "completed";
      return "failed";
    }

    return "pending";
  } catch (error) {
    console.error("Gateway status check error:", error);
    return "pending"; // Assume pending on error
  }
}
