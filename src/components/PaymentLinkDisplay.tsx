import React, { useEffect, useState } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentLinkDisplayProps {
  paymentUrl: string;
  upiString?: string;
  qrCodeData?: string;
  expiresAt?: string;
  orderTotal: number;
  onPaymentConfirmed?: () => void;
  isWaitingForPayment?: boolean;
}

export const PaymentLinkDisplay: React.FC<PaymentLinkDisplayProps> = ({
  paymentUrl,
  upiString,
  qrCodeData,
  expiresAt,
  orderTotal,
  onPaymentConfirmed,
  isWaitingForPayment = false,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { toast } = useToast();

  // Calculate time remaining for expiration
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const expires = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyUPI = () => {
    if (upiString) {
      navigator.clipboard.writeText(upiString);
      toast({
        title: "Copied",
        description: "UPI address copied to clipboard",
      });
    }
  };

  const handleDownloadQR = () => {
    const element = document.getElementById("payment-qr-code");
    const canvas = (element as any)?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `payment-qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenPaymentPage = () => {
    if (paymentUrl) {
      window.open(paymentUrl, "_blank");
    }
  };

  const handleCheckPaymentStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // In production, check actual payment status from gateway
      const response = await fetch("/api/payment/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "completed") {
          setPaymentConfirmed(true);
          toast({
            title: "Payment Confirmed",
            description: "Your payment has been received!",
          });
          onPaymentConfirmed?.();
        } else {
          toast({
            title: "Payment Pending",
            description: "Payment not yet received. Please complete the payment.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      toast({
        title: "Error",
        description: "Could not check payment status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  if (paymentConfirmed) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-green-700 mb-4">
              Amount: ₹{orderTotal.toFixed(2)}
            </p>
            <p className="text-green-600 mb-6">
              Your order is being prepared in the kitchen.
            </p>
            <Button className="bg-green-600 hover:bg-green-700" size="lg">
              View Order Status
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
          <p className="text-gray-600">Order Total: ₹{orderTotal.toFixed(2)}</p>
          {timeRemaining && (
            <p className={`text-sm mt-2 ${
              timeRemaining === "Expired" ? "text-red-600" : "text-gray-500"
            }`}>
              Valid for: <span className="font-mono font-bold">{timeRemaining}</span>
            </p>
          )}
        </div>

        {isWaitingForPayment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-800">Waiting for payment confirmation...</span>
          </div>
        )}

        {/* QR Code Display */}
        <div className="flex justify-center mb-6">
          <div
            id="payment-qr-code"
            className="bg-white p-4 rounded-lg border-2 border-gray-300"
          >
            <QRCode
              value={qrCodeData || paymentUrl}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Payment Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Scan QR */}
          <button
            onClick={handleDownloadQR}
            className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition"
          >
            <Download className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-blue-900">Download QR</p>
            <p className="text-sm text-blue-700">Save QR for later</p>
          </button>

          {/* Open Payment Link */}
          <button
            onClick={handleOpenPaymentPage}
            className="border-2 border-green-500 bg-green-50 rounded-lg p-4 hover:bg-green-100 transition"
          >
            <span className="inline-block mb-2">📱</span>
            <p className="font-medium text-green-900">Pay Now</p>
            <p className="text-sm text-green-700">Open payment page</p>
          </button>
        </div>

        {/* UPI Address */}
        {upiString && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">UPI Address:</p>
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded p-3">
              <code className="flex-1 text-sm font-mono break-all">{upiString}</code>
              <button
                onClick={handleCopyUPI}
                className="p-2 hover:bg-gray-100 rounded transition"
                title="Copy UPI address"
              >
                <Copy className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">How to pay:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Scan the QR code with your phone's payment app</li>
                <li>Or click "Pay Now" to open the payment link</li>
                <li>Complete the payment in your banking app</li>
                <li>Your order confirmation will appear automatically</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Check Status Button */}
        <button
          onClick={handleCheckPaymentStatus}
          disabled={isCheckingStatus}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
        >
          {isCheckingStatus ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Payment Status"
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Payment is processed securely through Razorpay.
            <br />
            Your order will be started once payment is confirmed.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PaymentLinkDisplay;
