import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  categories: Category[];
  onImportComplete: () => void;
}

interface ParsedItem {
  name: string;
  price: number;
  category: string;
  description: string;
  is_veg: boolean;
  valid: boolean;
  error?: string;
}

const CSVImportDialog = ({ open, onOpenChange, userId, categories, onImportComplete }: CSVImportDialogProps) => {
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const header = "name,price,category,description,veg_nonveg";
    const example = "Paneer Tikka,250,Starters,Grilled cottage cheese,veg\nChicken Biryani,350,Main Course,Hyderabadi style biryani,nonveg";
    const blob = new Blob([`${header}\n${example}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      toast.error("CSV mein kam se kam 1 item hona chahiye");
      return;
    }

    const items: ParsedItem[] = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const [name, priceStr, category, description, vegFlag] = cols;

      const price = parseFloat(priceStr);
      const is_veg = (vegFlag || "veg").toLowerCase() !== "nonveg";

      if (!name || name.length > 100) {
        return { name: name || "?", price: 0, category: "", description: "", is_veg: true, valid: false, error: "Invalid name" };
      }
      if (isNaN(price) || price <= 0 || price > 100000) {
        return { name, price: 0, category: category || "", description: description || "", is_veg, valid: false, error: "Invalid price" };
      }

      return {
        name: name.slice(0, 100),
        price,
        category: (category || "").slice(0, 50),
        description: (description || "").slice(0, 500),
        is_veg,
        valid: true,
      };
    });

    setParsedItems(items);
    setStep("preview");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("File 1MB se bada nahi ho sakta");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validItems = parsedItems.filter((i) => i.valid);
    if (validItems.length === 0) { toast.error("Koi valid item nahi hai"); return; }

    setImporting(true);
    try {
      // Create missing categories
      const uniqueCats = [...new Set(validItems.map((i) => i.category).filter(Boolean))];
      const existingCatNames = categories.map((c) => c.name.toLowerCase());
      const newCats = uniqueCats.filter((c) => !existingCatNames.includes(c.toLowerCase()));

      if (newCats.length > 0) {
        await supabase.from("menu_categories").insert(
          newCats.map((name, i) => ({ name, owner_id: userId, sort_order: categories.length + i }))
        );
      }

      // Re-fetch categories to get IDs
      const { data: allCats } = await supabase.from("menu_categories").select("*").eq("owner_id", userId);
      const catMap = new Map((allCats || []).map((c) => [c.name.toLowerCase(), c.id]));

      // Default category for items without category
      let defaultCatId = catMap.values().next().value;
      if (!defaultCatId) {
        const { data: newCat } = await supabase.from("menu_categories").insert({ name: "General", owner_id: userId, sort_order: 0 }).select().single();
        if (newCat) defaultCatId = newCat.id;
      }

      const inserts = validItems.map((item, i) => ({
        name: item.name,
        price: item.price,
        description: item.description || null,
        is_veg: item.is_veg,
        category_id: catMap.get(item.category.toLowerCase()) || defaultCatId,
        owner_id: userId,
        sort_order: i,
      }));

      const { error } = await supabase.from("menu_items").insert(inserts);
      if (error) throw error;

      toast.success(`${validItems.length} items import ho gaye! 🎉`);
      onImportComplete();
      handleClose();
    } catch (err) {
      toast.error("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedItems([]);
    setStep("upload");
    onOpenChange(false);
  };

  const validCount = parsedItems.filter((i) => i.valid).length;
  const invalidCount = parsedItems.filter((i) => !i.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            CSV se Menu Import Karo
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 mt-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
              <Download className="w-4 h-4 mr-2" /> Sample CSV Download Karo
            </Button>

            <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">CSV Format:</p>
              <code className="block bg-background rounded p-2 text-[11px] overflow-x-auto">
                name,price,category,description,veg_nonveg
              </code>
              <p>• <strong>veg_nonveg:</strong> "veg" ya "nonveg" likho</p>
              <p>• Category nahi hai toh auto-create ho jayegi</p>
            </div>

            <label className="flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed border-border rounded-xl p-8 hover:bg-muted/50 transition-colors">
              <FileText className="w-10 h-10 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">CSV file choose karo</span>
              <span className="text-xs text-muted-foreground">Max 1MB</span>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-3 mt-2 overflow-hidden">
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" /> {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="w-4 h-4" /> {invalidCount} errors
                </span>
              )}
            </div>

            <div className="overflow-y-auto max-h-[40vh] space-y-2 pr-1">
              {parsedItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    item.valid ? "bg-muted" : "bg-destructive/10 border border-destructive/20"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.is_veg ? "bg-green-600" : "bg-red-600"}`} />
                  <span className="flex-1 truncate font-medium">{item.name}</span>
                  {item.valid ? (
                    <span className="text-muted-foreground flex-shrink-0">₹{item.price}</span>
                  ) : (
                    <span className="text-destructive text-xs flex-shrink-0">{item.error}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep("upload"); setParsedItems([]); }} className="flex-1">
                Back
              </Button>
              <Button variant="hero" onClick={handleImport} disabled={validCount === 0 || importing} className="flex-1">
                {importing ? "Importing..." : `Import ${validCount} Items`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
