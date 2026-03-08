import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Receipt, Download } from "lucide-react";
import { motion } from "framer-motion";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface CustomerReceiptProps {
  orderId: string;
  restaurantName: string;
  tableNumber: number;
  items: ReceiptItem[];
  total: number;
  gstNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
}

const CustomerReceipt = ({
  orderId,
  restaurantName,
  tableNumber,
  items,
  total,
  gstNumber,
  address,
  phone,
  createdAt,
}: CustomerReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const gstRate = 0.05;
  const subtotal = total / (1 + gstRate);
  const gstAmount = total - subtotal;

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; font-size: 12px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #333; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${receiptRef.current.innerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-4 bg-card border border-border rounded-2xl shadow-card overflow-hidden"
    >
      <button
        onClick={printReceipt}
        className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Receipt className="w-4 h-4" />
          View Receipt
        </span>
        <Download className="w-4 h-4 text-muted-foreground" />
      </button>

      <div ref={receiptRef} className="px-5 py-4 text-xs text-foreground font-mono">
        <div className="text-center mb-3">
          <p className="font-bold text-sm">{restaurantName || "Restaurant"}</p>
          {address && <p className="text-muted-foreground">{address}</p>}
          {phone && <p className="text-muted-foreground">Ph: {phone}</p>}
          {gstNumber && <p className="text-muted-foreground">GSTIN: {gstNumber}</p>}
        </div>

        <div className="border-t border-dashed border-border my-2" />

        <div className="flex justify-between text-muted-foreground mb-1">
          <span>Order: #{orderId.slice(0, 8)}</span>
          <span>Table: {tableNumber}</span>
        </div>
        <p className="text-muted-foreground mb-2">{createdAt}</p>

        <div className="border-t border-dashed border-border my-2" />

        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-border my-2" />

        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>GST (5%)</span>
          <span>₹{gstAmount.toFixed(0)}</span>
        </div>

        <div className="border-t border-dashed border-border my-2" />

        <div className="flex justify-between font-bold text-sm">
          <span>Total</span>
          <span>₹{total.toFixed(0)}</span>
        </div>

        <div className="text-center mt-3 text-muted-foreground">
          <p>Thank you! Visit again 🙏</p>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerReceipt;
