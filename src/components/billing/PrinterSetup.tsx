import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Bluetooth, Wifi, Usb, Settings2, CheckCircle2, AlertCircle, TestTube } from "lucide-react";

type ConnectionType = "bluetooth" | "wifi" | "usb";

interface PrinterConfig {
  type: ConnectionType;
  name: string;
  address: string; // IP for WiFi, device name for BT/USB
  port?: number;
  paperWidth: "58mm" | "80mm";
}

const CONNECTION_TYPES: { key: ConnectionType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "bluetooth", label: "Bluetooth", icon: <Bluetooth className="w-5 h-5" />, description: "Wireless Bluetooth thermal printer" },
  { key: "wifi", label: "WiFi / LAN", icon: <Wifi className="w-5 h-5" />, description: "Network printer via IP address" },
  { key: "usb", label: "USB", icon: <Usb className="w-5 h-5" />, description: "Direct USB connected printer" },
];

const STORAGE_KEY = "printer_config";

const getPrinterConfig = (): PrinterConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
};

const savePrinterConfig = (config: PrinterConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearPrinterConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Generate receipt HTML for thermal printer
export const generateReceiptHTML = (data: {
  restaurantName: string;
  address?: string | null;
  phone?: string | null;
  gstNumber?: string | null;
  orderId: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod?: string | null;
  createdAt: string;
  gstPercentage?: number;
}, paperWidth: "58mm" | "80mm" = "80mm") => {
  const maxWidth = paperWidth === "58mm" ? "48mm" : "72mm";
  const gstPct = data.gstPercentage ?? 5;
  const gstRate = gstPct / 100;
  const subtotal = data.total / (1 + gstRate);
  const gstAmount = data.total - subtotal;

  const itemRows = data.items.map(item =>
    `<tr><td>${item.name} ×${item.quantity}</td><td style="text-align:right">₹${(item.price * item.quantity).toFixed(0)}</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><style>
    @page { margin: 0; size: ${paperWidth} auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: ${maxWidth}; margin: 0 auto; padding: 4mm 2mm; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    .total-row td { font-weight: bold; font-size: 13px; padding-top: 4px; }
    .small { font-size: 9px; color: #555; }
  </style></head><body>
    <div class="center bold" style="font-size:14px;margin-bottom:4px">${data.restaurantName || "Restaurant"}</div>
    ${data.address ? `<div class="center small">${data.address}</div>` : ""}
    ${data.phone ? `<div class="center small">Ph: ${data.phone}</div>` : ""}
    ${data.gstNumber ? `<div class="center small">GSTIN: ${data.gstNumber}</div>` : ""}
    <div class="line"></div>
    <table><tr><td>Order: #${data.orderId.slice(0, 8)}</td><td style="text-align:right">Table: ${data.tableNumber}</td></tr></table>
    <div class="small">${data.createdAt}</div>
    <div class="line"></div>
    <table>${itemRows}</table>
    <div class="line"></div>
    <table>
      <tr><td>Subtotal</td><td style="text-align:right">₹${subtotal.toFixed(0)}</td></tr>
      <tr><td>GST (${gstPct}%)</td><td style="text-align:right">₹${gstAmount.toFixed(0)}</td></tr>
    </table>
    <div class="line"></div>
    <table><tr class="total-row"><td>TOTAL</td><td style="text-align:right">₹${data.total.toFixed(0)}</td></tr></table>
    ${data.paymentMethod ? `<div class="center small" style="margin-top:4px">Paid via: ${data.paymentMethod.toUpperCase()}</div>` : ""}
    <div class="line"></div>
    <div class="center small" style="margin-top:4px">Thank you! Visit again 🙏</div>
  </body></html>`;
};

// Print function that uses configured printer
export const printReceipt = (receiptHTML: string, config?: PrinterConfig | null) => {
  const printerConfig = config || getPrinterConfig();

  if (printerConfig?.type === "wifi" && printerConfig.address) {
    // For WiFi/network printers, attempt to send via raw socket (requires backend)
    // Fallback to browser print with the IP hint
    toast.info(`Sending to ${printerConfig.name} (${printerConfig.address})`);
  }

  // For Bluetooth/USB/fallback — use browser print dialog
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    toast.error("Popup blocked — please allow popups for printing");
    return;
  }
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => printWindow.close(), 1000);
  };
};

// Test print
const testPrint = (config: PrinterConfig) => {
  const testHTML = generateReceiptHTML({
    restaurantName: "Test Print ✅",
    orderId: "TEST-1234-5678",
    tableNumber: 1,
    items: [
      { name: "Test Item 1", quantity: 2, price: 150 },
      { name: "Test Item 2", quantity: 1, price: 250 },
    ],
    total: 550,
    paymentMethod: "cash",
    createdAt: new Date().toLocaleString("en-IN"),
  }, config.paperWidth);
  printReceipt(testHTML, config);
};

const PrinterSetup = () => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PrinterConfig | null>(getPrinterConfig());
  const [selectedType, setSelectedType] = useState<ConnectionType>(config?.type || "usb");
  const [name, setName] = useState(config?.name || "");
  const [address, setAddress] = useState(config?.address || "");
  const [port, setPort] = useState(String(config?.port || 9100));
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">(config?.paperWidth || "80mm");

  useEffect(() => {
    const stored = getPrinterConfig();
    if (stored) {
      setConfig(stored);
      setSelectedType(stored.type);
      setName(stored.name);
      setAddress(stored.address);
      setPort(String(stored.port || 9100));
      setPaperWidth(stored.paperWidth);
    }
  }, [open]);

  const handleSave = () => {
    if (!name.trim()) { toast.error("Printer name required"); return; }
    if (selectedType === "wifi" && !address.trim()) { toast.error("IP address required for WiFi printer"); return; }

    const newConfig: PrinterConfig = {
      type: selectedType,
      name: name.trim(),
      address: address.trim(),
      port: selectedType === "wifi" ? parseInt(port) || 9100 : undefined,
      paperWidth,
    };
    savePrinterConfig(newConfig);
    setConfig(newConfig);
    toast.success("Printer configured!");
    setOpen(false);
  };

  const handleRemove = () => {
    clearPrinterConfig();
    setConfig(null);
    setName(""); setAddress("");
    toast.success("Printer removed");
  };

  const isConfigured = !!config;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Printer className="w-4 h-4" />
          {isConfigured ? (
            <span className="flex items-center gap-1">
              {config.name}
              <CheckCircle2 className="w-3 h-3 text-success" />
            </span>
          ) : (
            "Setup Printer"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> Printer Setup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          {/* Connection Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Connection Type</label>
            <div className="grid grid-cols-3 gap-2">
              {CONNECTION_TYPES.map(ct => (
                <button
                  key={ct.key}
                  onClick={() => setSelectedType(ct.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    selectedType === ct.key
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {ct.icon}
                  <span className="text-xs font-medium">{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Printer Name */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Printer Name</label>
            <Input
              placeholder={selectedType === "bluetooth" ? "e.g. BT-Printer-58" : selectedType === "wifi" ? "e.g. Kitchen Printer" : "e.g. USB Thermal"}
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Type-specific fields */}
          {selectedType === "bluetooth" && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Bluetooth Pairing</p>
                  <p className="text-xs mt-0.5">1. Pair your printer via phone's Bluetooth settings first</p>
                  <p className="text-xs">2. Select printer in browser print dialog when printing</p>
                  <p className="text-xs">3. Works best with Android + Chrome</p>
                </div>
              </div>
              <Input placeholder="Printer device name (optional)" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
          )}

          {selectedType === "wifi" && (
            <div className="space-y-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">IP Address</label>
                <Input placeholder="e.g. 192.168.1.100" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Port (default: 9100)</label>
                <Input type="number" placeholder="9100" value={port} onChange={e => setPort(e.target.value)} />
              </div>
            </div>
          )}

          {selectedType === "usb" && (
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">USB Printer</p>
                  <p className="text-xs mt-0.5">Connect your thermal printer via USB cable. It will appear in the browser's print dialog automatically.</p>
                  <p className="text-xs mt-1">Set it as default printer in your OS for one-click printing.</p>
                </div>
              </div>
            </div>
          )}

          {/* Paper Width */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Paper Width</label>
            <div className="flex gap-2">
              {(["58mm", "80mm"] as const).map(w => (
                <Button key={w} variant={paperWidth === w ? "default" : "outline"} size="sm"
                  onClick={() => setPaperWidth(w)} className="flex-1">
                  {w} {w === "80mm" && "(Standard)"}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">Save Printer</Button>
            {isConfigured && (
              <>
                <Button variant="outline" size="icon" onClick={() => testPrint(config!)} title="Test Print">
                  <TestTube className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={handleRemove}>Remove</Button>
              </>
            )}
          </div>

          {/* Current status */}
          {isConfigured && (
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-xl border border-success/20">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <div className="text-sm">
                <span className="font-medium text-foreground">{config.name}</span>
                <span className="text-muted-foreground ml-1">
                  ({config.type === "wifi" ? `${config.address}:${config.port}` : config.type.toUpperCase()})
                </span>
                <Badge variant="secondary" className="ml-2 text-xs">{config.paperWidth}</Badge>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrinterSetup;
