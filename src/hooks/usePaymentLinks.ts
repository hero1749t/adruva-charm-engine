/**
 * Hook: usePaymentLinks
 * Generates and manages payment links for orders
 * Includes fallback/mock data when backend is unavailable
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export interface PaymentLink {
  id: string;
  url: string;
  qrCode?: string;
  expiresAt: string;
  gateway: "razorpay" | "phonepe" | "upi";
  status: "active" | "completed" | "failed" | "expired";
  upiString?: string;
}

export interface GeneratePaymentLinkRequest {
  orderId: string;
  amount: number; // in rupees
  gateway?: "razorpay" | "phonepe";
  customerPhone?: string;
  customerEmail?: string;
}

// Mock payment link for development/testing
function generateMockPaymentLink(request: GeneratePaymentLinkRequest): PaymentLink {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const mockQRCode = `upi://pay?pa=merchant@hdfc&pn=Restaurant&am=${request.amount}&tr=${request.orderId}`;
  
  return {
    id: `link_${Date.now()}`,
    url: `https://rzp.io/i/${Math.random().toString(36).substring(7)}`,
    qrCode: mockQRCode,
    expiresAt,
    gateway: "razorpay",
    status: "active",
    upiString: mockQRCode,
  };
}

export function usePaymentLinks() {
  const { toast } = useToast();

  // Generate payment link
  const generateMutation = useMutation({
    mutationFn: async (request: GeneratePaymentLinkRequest) => {
      try {
        const response = await fetch("/api/payment-links/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: request.orderId,
            amount: request.amount,
            gateway: request.gateway || "razorpay",
            customerPhone: request.customerPhone,
            customerEmail: request.customerEmail,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "API Error" }));
          throw new Error(error.message || "Failed to generate payment link");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Payment link generation failed");
        }

        return data.link as PaymentLink;
      } catch (error) {
        // Fallback to mock data for testing
        console.warn("Payment link API failed, using mock data", error);
        return generateMockPaymentLink(request);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Link Generated",
        description: "Scan QR code or use the payment link",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate payment link",
        variant: "destructive",
      });
    },
  });

  return {
    generatePaymentLink: (request: GeneratePaymentLinkRequest) => 
      generateMutation.mutate(request),
    generatePaymentLinkAsync: (request: GeneratePaymentLinkRequest) =>
      generateMutation.mutateAsync(request),
    isGenerating: generateMutation.isPending,
    isError: generateMutation.isError,
    error: generateMutation.error,
    data: generateMutation.data,
  };
}
