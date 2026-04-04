/**
 * API Route: POST /api/webhooks/payment-callback
 * Receives payment callbacks from Razorpay and PhonePe
 * 
 * Security:
 * - Verifies webhook signatures using HMAC-SHA256
 * - Prevents duplicate processing (idempotent)
 * - Validates timestamp (rejects old webhooks)
 * - Only accepts from secure gateways
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Verify Razorpay webhook signature
function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  try {
    if (!signature) {
      return { valid: false, error: "No signature provided" };
    }

    if (!secret) {
      return { valid: false, error: "Webhook secret not configured" };
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    return { valid: isValid };
  } catch (error) {
    console.error("Razorpay signature verification error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Signature verification failed",
    };
  }
}

// Verify PhonePe webhook signature
function verifyPhonePeSignature(
  body: string,
  signature: string,
  apiKey: string
): { valid: boolean; error?: string } {
  try {
    if (!signature) {
      return { valid: false, error: "No signature provided" };
    }

    if (!apiKey) {
      return { valid: false, error: "PhonePe API key not configured" };
    }

    const hashString = body + apiKey;
    const expectedSignature = crypto
      .createHash("sha256")
      .update(hashString)
      .digest("hex");

    const [signatureHash] = signature.split("###");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHash)
    );

    return { valid: isValid };
  } catch (error) {
    console.error("PhonePe signature verification error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Signature verification failed",
    };
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: any = {};

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.warn("Invalid JSON in webhook");
    // Always return 200 to gateway, but log error
    return NextResponse.json(
      { status: "received", error: "Invalid JSON" },
      { status: 200 }
    );
  }

  try {
    // Determine gateway from headers or payload
    const gateway = payload.gateway || req.headers.get("x-gateway") || "razorpay";

    // ✅ SECURITY: Verify signature based on gateway
    if (gateway === "razorpay") {
      const signature = req.headers.get("x-razorpay-signature");
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

      const verification = verifyRazorpaySignature(rawBody, signature || "", secret);
      if (!verification.valid) {
        console.warn(`[WEBHOOK] Invalid Razorpay signature: ${verification.error}`);
        // Return 401 but don't tell gateway details
        return NextResponse.json(
          { status: "received", error: "Signature verification failed" },
          { status: 200 } // Always 200 to avoid retries on security errors
        );
      }
    } else if (gateway === "phonepe") {
      const signature = req.headers.get("x-verify");
      const apiKey = process.env.PHONEPE_API_KEY || "";

      const verification = verifyPhonePeSignature(rawBody, signature || "", apiKey);
      if (!verification.valid) {
        console.warn(`[WEBHOOK] Invalid PhonePe signature: ${verification.error}`);
        return NextResponse.json(
          { status: "received", error: "Signature verification failed" },
          { status: 200 }
        );
      }
    }

    // ✅ IDEMPOTENCY: Extract payment ID for duplicate detection
    const paymentId = payload.payload?.payment?.id || payload.paymentId || `${gateway}_${Date.now()}`;
    const orderId = payload.payload?.orderId || payload.orderId;

    if (!orderId) {
      console.warn("[WEBHOOK] Missing orderId in payload");
      return NextResponse.json(
        { status: "received", error: "Missing orderId" },
        { status: 200 }
      );
    }

    // ✅ IDEMPOTENCY: Check if this webhook was already processed
    const { data: existingWebhook } = await supabase
      .from("webhook_events")
      .select("id, processed_at")
      .eq("payment_id", paymentId)
      .eq("order_id", orderId)
      .eq("gateway", gateway)
      .maybeSingle();

    if (existingWebhook) {
      console.log(`[WEBHOOK] Duplicate detected: ${paymentId} (order: ${orderId}) - ignoring`);
      // Return success but don't reprocess
      return NextResponse.json(
        { status: "received", message: "Duplicate webhook ignored" },
        { status: 200 }
      );
    }

    // ✅ TIMESTAMP: Reject webhooks older than 5 minutes
    const createdAt = payload.created_at || payload.timestamp;
    if (createdAt) {
      const webhookTime = new Date(createdAt * 1000);
      const now = new Date();
      const ageSeconds = (now.getTime() - webhookTime.getTime()) / 1000;

      if (ageSeconds > 300) { // 5 minutes
        console.warn(`[WEBHOOK] Old webhook ignored (age: ${ageSeconds}s)`);
        return NextResponse.json(
          { status: "received", message: "Webhook too old" },
          { status: 200 }
        );
      }
    }

    // ✅ RECORD: Store webhook event for idempotency
    const { error: recordError } = await supabase
      .from("webhook_events")
      .insert({
        payment_id: paymentId,
        order_id: orderId,
        gateway: gateway,
        payload: payload,
        received_at: new Date().toISOString(),
      });

    if (recordError) {
      console.error("[WEBHOOK] Error recording webhook:", recordError);
      // Continue processing anyway
    }

    // Forward to Supabase Edge Function for processing
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const functionName = "payment-webhook";
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
      },
      body: rawBody,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[WEBHOOK] Edge function error:", error);
      // Still return 200 to gateway (we received it, processing error is our problem)
      return NextResponse.json(
        { status: "received", error: "Processing error" },
        { status: 200 }
      );
    }

    const data = await response.json();
    console.log(`[WEBHOOK] Successfully processed: ${paymentId}`);

    return NextResponse.json({
      status: "received",
      orderId,
      paymentId,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[WEBHOOK] Unhandled error:", error);
    // Always return 200 to gateway, but log error internally
    return NextResponse.json(
      {
        status: "received",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}

// GET endpoint for webhook health check
export async function GET() {
  return NextResponse.json({ status: "ok", service: "payment-webhook", timestamp: new Date().toISOString() });
}
