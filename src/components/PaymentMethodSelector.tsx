import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Smartphone, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodSelectorProps {
  orderId: string;
  orderTotal: number; // in rupees
  customerPhone?: string;
  onUPISelected?: (paymentLink: string) => void;
  onCashierSelected?: () => void;
  isLoading?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  orderId,
  orderTotal,
  customerPhone,
  onUPISelected,
  onCashierSelected,
  isLoading = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "cashier" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleUPIClick = async () => {
    setSelectedMethod("upi");
    setIsProcessing(true);

    try {
      // Call API to generate payment link
      const response = await fetch("/api/payment-links/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          amount: orderTotal,
          gateway: "razorpay",
          customerPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: Failed to generate payment link`
        );
      }

      const data = await response.json();

      if (data.success && data.link) {
        toast({
          title: "Payment Link Generated",
          description: "Scan the QR code with your phone's payment app",
        });

        onUPISelected?.(data.link.url || data.link);
      } else if (data.link) {
        // Even if success is false, if we have a link, use it (mock mode)
        toast({
          title: "Using Test Payment Link",
          description: "Backend not connected. This is a demo payment link.",
        });
        onUPISelected?.(data.link.url || data.link);
      } else {
        throw new Error(data.error || "Failed to generate payment link");
      }
    } catch (error) {
      console.error("Payment link generation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Could not generate payment link";
      
      toast({
        title: "Payment Processing",
        description: `${errorMessage}. Trying fallback payment...`,
        variant: "default",
      });

      // Try cashier fallback after 1 second
      setTimeout(() => {
        setSelectedMethod("cashier");
        onCashierSelected?.();
        toast({
          title: "Switched to Counter Payment",
          description: "Please pay at the counter. Staff will be notified.",
        });
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashierClick = () => {
    setSelectedMethod("cashier");
    onCashierSelected?.();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Choose Payment Method</h2>
          <p className="text-gray-600">Order Total: ₹{orderTotal.toFixed(2)}</p>
        </div>

        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800">Processing...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* UPI Payment Option */}
          <button
            onClick={handleUPIClick}
            disabled={isProcessing || isLoading}
            className={`border-2 rounded-lg p-6 transition-all transform hover:scale-105 ${
              selectedMethod === "upi"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-500"
            } ${(isProcessing || isLoading) && "opacity-50 cursor-not-allowed"}`}
          >
            <div className="flex flex-col items-center gap-3">
              {isProcessing && selectedMethod === "upi" ? (
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              ) : (
                <Smartphone className="w-12 h-12 text-blue-600" />
              )}
              <div className="text-left w-full">
                <h3 className="font-bold text-lg">Pay Online</h3>
                <p className="text-sm text-gray-600">UPI/Card via Razorpay</p>
                <p className="text-xs text-gray-500 mt-2">Instant payment</p>
              </div>
            </div>
          </button>

          {/* Cashier Payment Option */}
          <button
            onClick={handleCashierClick}
            disabled={isProcessing || isLoading}
            className={`border-2 rounded-lg p-6 transition-all transform hover:scale-105 ${
              selectedMethod === "cashier"
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-green-500"
            } ${(isProcessing || isLoading) && "opacity-50 cursor-not-allowed"}`}
          >
            <div className="flex flex-col items-center gap-3">
              <Wallet className="w-12 h-12 text-green-600" />
              <div className="text-left w-full">
                <h3 className="font-bold text-lg">Pay at Counter</h3>
                <p className="text-sm text-gray-600">
                  Cash/Card/UPI/Split
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Staff will come to table
                </p>
              </div>
            </div>
          </button>
        </div>

        {selectedMethod === "cashier" && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              ✓ Staff has been notified
            </p>
            <p className="text-green-700 text-sm mt-1">
              A staff member will come to your table shortly to collect payment.
            </p>
          </div>
        )}

        {selectedMethod === "upi" && !isProcessing && (
          <div className="mt-6 text-center">
            <Button className="w-full" size="lg">
              Proceed to Payment
            </Button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Your order will be prepared while you complete payment.
            <br />
            You'll receive a notification when it's ready.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PaymentMethodSelector;
