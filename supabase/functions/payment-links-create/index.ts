/**
 * Payment Links API - Supabase Edge Function
 * Creates payment links using Razorpay or PhonePe
 * 
 * Endpoint: POST /api/payment-links/create
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
const PHONEPE_MERCHANT_ID = Deno.env.get("PHONEPE_MERCHANT_ID") || "";
const PHONEPE_API_KEY = Deno.env.get("PHONEPE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

interface CreatePaymentLinkRequest {
  orderId: string;
  amount: number; // in rupees
  gateway: "razorpay" | "phonepe";
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
}

interface CreatePaymentLinkResponse {
  success: boolean;
  link?: {
    id: string;
    url: string;
    qrCode?: string;
    expiresAt: string;
    gateway: string;
  };
  error?: string;
}

/**
 * Generate Razorpay Payment Link
 */
async function generateRazorpayLink(
  orderId: string,
  amount: number,
  customerPhone?: string,
  customerEmail?: string
): Promise<CreatePaymentLinkResponse> {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    const amountInPaise = Math.round(amount * 100);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const payload = {
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: `Restaurant Order ${orderId}`,
      customer: {
        contact: customerPhone || "",
        email: customerEmail || "",
      },
      notify: {
        sms: customerPhone ? 1 : 0,
        email: customerEmail ? 1 : 0,
      },
      reminder_enable: true,
      notes: {
        order_id: orderId,
      },
      callback_url: `${Deno.env.get("BASE_URL")}/payment/callback`,
      callback_method: "get",
    };

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Razorpay API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      link: {
        id: data.id,
        url: data.short_url || data.url,
        qrCode: data.upi_link,
        expiresAt: expiresAt.toISOString(),
        gateway: "razorpay",
      },
    };
  } catch (error) {
    console.error("Razorpay error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Razorpay error",
    };
  }
}

/**
 * Generate PhonePe Payment Link
 */
async function generatePhonePeLink(
  orderId: string,
  amount: number,
  customerPhone?: string
): Promise<CreatePaymentLinkResponse> {
  try {
    if (!PHONEPE_MERCHANT_ID || !PHONEPE_API_KEY) {
      throw new Error("PhonePe credentials not configured");
    }

    const amountInPaise = Math.round(amount * 100);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const transactionId = `${Date.now()}-${orderId.slice(0, 8)}`;

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: orderId,
      amount: amountInPaise,
      redirectUrl: `${Deno.env.get("BASE_URL")}/payment/callback?orderId=${orderId}`,
      redirectMode: "REDIRECT",
      callbackUrl: `${Deno.env.get("BASE_URL")}/api/webhooks/payment-callback`,
      mobileNumber: customerPhone?.replace(/\D/g, "") || "",
      paymentInstrument: {
        type: "UPI_QR",
      },
    };

    const payloadString = JSON.stringify(payload);
    const hashString = payloadString + PHONEPE_API_KEY;
    const hashBytes = new TextEncoder().encode(hashString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const xVerify = `${hashHex}###1`;

    const response = await fetch("https://api.phonepe.com/apis/hermes/pg/v1/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`PhonePe API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`PhonePe response failed: ${data.message}`);
    }

    return {
      success: true,
      link: {
        id: transactionId,
        url: data.data.instrumentResponse.redirectUrl,
        qrCode: data.data.instrumentResponse.qrUrl,
        expiresAt: expiresAt.toISOString(),
        gateway: "phonepe",
      },
    };
  } catch (error) {
    console.error("PhonePe error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "PhonePe error",
    };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as CreatePaymentLinkRequest;
    const { orderId, amount, gateway, customerPhone, customerEmail } = body;

    if (!orderId || !amount || !gateway) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let result: CreatePaymentLinkResponse;

    if (gateway === "razorpay") {
      result = await generateRazorpayLink(orderId, amount, customerPhone, customerEmail);
      // Fallback to PhonePe if Razorpay fails
      if (!result.success && result.error?.includes("credentials")) {
        result = await generatePhonePeLink(orderId, amount, customerPhone);
      }
    } else if (gateway === "phonepe") {
      result = await generatePhonePeLink(orderId, amount, customerPhone);
      // Fallback to Razorpay if PhonePe fails
      if (!result.success && result.error?.includes("credentials")) {
        result = await generateRazorpayLink(orderId, amount, customerPhone, customerEmail);
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unknown gateway",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (result.success) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
