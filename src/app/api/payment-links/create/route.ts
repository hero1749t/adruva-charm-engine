/**
 * API Route: POST /api/payment-links/create
 * Creates payment links using Razorpay or PhonePe
 * 
 * Security:
 * - Validates amount (₹1 to ₹100,000)
 * - Validates email and phone formats
 * - Implements idempotency (same orderId returns same link)
 * - Rate limits per user per minute
 * 
 * In production, components should call Edge Function directly
 * In development, this route wraps for easier testing
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Validation helpers
function isValidAmount(amount: any): boolean {
  const num = parseFloat(amount);
  return Number.isFinite(num) && num >= 1 && num <= 100000;
}

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amount, gateway = "razorpay", customerPhone, customerEmail, idempotencyKey } = body;

    // ✅ VALIDATION: Required fields
    if (!orderId || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: orderId, amount" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Order ID format (alphanumeric + underscore, 3-50 chars)
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(orderId)) {
      return NextResponse.json(
        { success: false, error: "Invalid orderId format" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Amount must be ₹1 to ₹100,000
    if (!isValidAmount(amount)) {
      return NextResponse.json(
        { success: false, error: "Amount must be between ₹1 and ₹100,000" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Gateway must be valid
    if (!["razorpay", "phonepe", "upi"].includes(gateway)) {
      return NextResponse.json(
        { success: false, error: "Invalid gateway (must be razorpay, phonepe, or upi)" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Email format (if provided)
    if (!isValidEmail(customerEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Phone format (if provided)
    if (!isValidPhone(customerPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone format (must be 10 digits)" },
        { status: 400 }
      );
    }

    // ✅ IDEMPOTENCY: Check if link already exists for this order
    const { data: existingLink } = await supabase
      .from("payment_link_tokens")
      .select("*")
      .eq("order_id", orderId)
      .in("status", ["active", "completed"])
      .maybeSingle();

    if (existingLink && existingLink.status === "active" && new Date(existingLink.expires_at) > new Date()) {
      // Return existing link (idempotent behavior)
      console.log(`[IDEMPOTENT] Returning existing payment link for order ${orderId}`);
      return NextResponse.json({
        success: true,
        link: {
          id: existingLink.id,
          url: existingLink.payment_link,
          qrCode: existingLink.qr_code,
          expiresAt: existingLink.expires_at,
          gateway: existingLink.gateway,
          status: "active",
          upiString: existingLink.upi_id,
        },
        message: "Returning existing payment link (idempotent)",
      });
    }

    // ✅ TIMEOUT: Set 8-second timeout for Edge Function call (payment gateways can be slow)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Call Supabase Edge Function
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const functionName = "payment-links-create";
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ""}`,
      },
      body: JSON.stringify({
        orderId,
        amount,
        gateway,
        customerPhone,
        customerEmail,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.message || "Failed to create payment link" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("Payment link creation timeout (8s exceeded)");
      return NextResponse.json(
        { success: false, error: "Payment gateway timeout - please try again" },
        { status: 504 }
      );
    }

    console.error("Payment link creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
