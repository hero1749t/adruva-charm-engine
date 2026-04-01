import { useRef } from "react";
import { Receipt, Download, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface MenuStyle {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
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
  gstPercentage?: number;
  logoUrl?: string | null;
  menuStyle?: MenuStyle | null;
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
  gstPercentage = 5,
  logoUrl,
  menuStyle,
}: CustomerReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const cm = !!menuStyle;

  const gstRate = gstPercentage / 100;
  const subtotal = total / (1 + gstRate);
  const gstAmount = total - subtotal;

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: ${cm ? `'${menuStyle!.font_body}', ` : ""}'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; font-size: 12px; }
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

  const downloadPDF = async () => {
    if (!receiptRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, canvas.height * 80 / canvas.width] });
    pdf.addImage(imgData, "PNG", 0, 0, 80, canvas.height * 80 / canvas.width);
    pdf.save(`receipt-${orderId.slice(0, 8)}.pdf`);
  };

  const shareOnWhatsApp = () => {
    const itemLines = items.map((item) => `• ${item.name} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(0)}`).join("\n");
    const message = [
      `🧾 *Receipt - ${restaurantName || "Restaurant"}*`,
      `Order #${orderId.slice(0, 8)} | Table ${tableNumber}`,
      `📅 ${createdAt}`,
      ``,
      `*Items:*`,
      itemLines,
      ``,
      `Subtotal: ₹${subtotal.toFixed(0)}`,
      `GST (${gstPercentage}%): ₹${gstAmount.toFixed(0)}`,
      `*Total: ₹${total.toFixed(0)}*`,
      ``,
      `Thank you! 🙏`,
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Branded button styles
  const btnAccent = cm ? { backgroundColor: menuStyle!.primary_color + "15", color: menuStyle!.primary_color } : {};
  const borderColor = cm ? menuStyle!.primary_color + "30" : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-4 rounded-2xl shadow-card overflow-hidden"
      style={cm ? { border: `1px solid ${borderColor}`, backgroundColor: menuStyle!.background_color } : undefined}
    >
      {!cm && <div className="absolute inset-0 bg-card border border-border rounded-2xl -z-10" />}
      <div className="flex" style={cm ? { borderBottom: `1px solid ${borderColor}` } : undefined}>
        <button
          onClick={printReceipt}
          className={cm ? "flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors border-r" : "flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors border-r border-border"}
          style={cm ? { borderColor: borderColor, color: menuStyle!.text_color } : undefined}
        >
          <Receipt className="w-4 h-4" />
          <span className="text-sm font-semibold">Print</span>
        </button>
        <button
          onClick={downloadPDF}
          className={cm ? "flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors border-r" : "flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 transition-colors border-r border-border"}
          style={cm ? { ...btnAccent, borderColor: borderColor } : undefined}
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-semibold">PDF</span>
        </button>
        <button
          onClick={shareOnWhatsApp}
          className={cm ? "flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors" : "flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent/50 hover:bg-accent transition-colors"}
          style={cm ? { color: menuStyle!.text_color } : undefined}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">WhatsApp</span>
        </button>
      </div>

      <div
        ref={receiptRef}
        className={cm ? "px-5 py-4 text-xs font-mono" : "px-5 py-4 text-xs text-foreground font-mono"}
        style={cm ? { color: menuStyle!.text_color, fontFamily: `'${menuStyle!.font_body}', 'Courier New', monospace`, backgroundColor: "#fff" } : undefined}
      >
        <div className="text-center mb-3">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover mx-auto mb-2" />
          )}
          <p
            className="font-bold text-sm"
            style={cm ? { fontFamily: `'${menuStyle!.font_heading}', sans-serif`, color: menuStyle!.primary_color } : undefined}
          >
            {restaurantName || "Restaurant"}
          </p>
          {address && <p className={cm ? "opacity-60" : "text-muted-foreground"}>{address}</p>}
          {phone && <p className={cm ? "opacity-60" : "text-muted-foreground"}>Ph: {phone}</p>}
          {gstNumber && <p className={cm ? "opacity-60" : "text-muted-foreground"}>GSTIN: {gstNumber}</p>}
        </div>

        <div className="my-2" style={{ borderTop: `1px dashed ${cm ? menuStyle!.text_color + "40" : ""}` }}>
          {!cm && <div className="border-t border-dashed border-border" />}
        </div>

        <div className="flex justify-between mb-1" style={cm ? { color: menuStyle!.text_color + "99" } : undefined}>
          {!cm && <span className="text-muted-foreground">Order: #{orderId.slice(0, 8)}</span>}
          {cm && <span>Order: #{orderId.slice(0, 8)}</span>}
          {!cm && <span className="text-muted-foreground">Table: {tableNumber}</span>}
          {cm && <span>Table: {tableNumber}</span>}
        </div>
        <p className={cm ? "" : "text-muted-foreground"} style={cm ? { color: menuStyle!.text_color + "99" } : undefined}>{createdAt}</p>

        <div className="my-2" style={{ borderTop: `1px dashed ${cm ? menuStyle!.text_color + "40" : ""}` }}>
          {!cm && <div className="border-t border-dashed border-border" />}
        </div>

        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="my-2" style={{ borderTop: `1px dashed ${cm ? menuStyle!.text_color + "40" : ""}` }}>
          {!cm && <div className="border-t border-dashed border-border" />}
        </div>

        <div className="flex justify-between" style={cm ? { color: menuStyle!.text_color + "99" } : undefined}>
          {!cm && <><span className="text-muted-foreground">Subtotal</span><span className="text-muted-foreground">₹{subtotal.toFixed(0)}</span></>}
          {cm && <><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></>}
        </div>
        <div className="flex justify-between" style={cm ? { color: menuStyle!.text_color + "99" } : undefined}>
          {!cm && <><span className="text-muted-foreground">GST ({gstPercentage}%)</span><span className="text-muted-foreground">₹{gstAmount.toFixed(0)}</span></>}
          {cm && <><span>GST ({gstPercentage}%)</span><span>₹{gstAmount.toFixed(0)}</span></>}
        </div>

        <div className="my-2" style={{ borderTop: `1px dashed ${cm ? menuStyle!.text_color + "40" : ""}` }}>
          {!cm && <div className="border-t border-dashed border-border" />}
        </div>

        <div
          className="flex justify-between font-bold text-sm"
          style={cm ? { color: menuStyle!.primary_color, fontFamily: `'${menuStyle!.font_heading}', sans-serif` } : undefined}
        >
          <span>Total</span>
          <span>₹{total.toFixed(0)}</span>
        </div>

        <div className="text-center mt-3" style={cm ? { color: menuStyle!.text_color + "80" } : undefined}>
          {!cm && <p className="text-muted-foreground">Thank you! Visit again 🙏</p>}
          {cm && <p>Thank you! Visit again 🙏</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerReceipt;
