import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type Combo = { id: string; name: string; description: string | null; combo_price: number; is_available: boolean; image_url: string | null };
type ComboItem = { id: string; combo_id: string; menu_item_id: string; quantity: number };

interface ComboManagerProps {
  userId: string;
  allItems: MenuItem[];
  onDataChange?: () => void;
}

const ComboManager = ({ userId, allItems, onDataChange }: ComboManagerProps) => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [form, setForm] = useState({ name: "", description: "", combo_price: "" });
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // itemId -> qty

  const fetchData = async () => {
    const { data: c } = await supabase.from("menu_combos").select("*").eq("owner_id", userId).order("sort_order") as any;
    if (c) {
      setCombos(c);
      const ids = c.map((x: any) => x.id);
      if (ids.length > 0) {
        const { data: ci } = await supabase.from("combo_items").select("*").in("combo_id", ids) as any;
        if (ci) setComboItems(ci);
      }
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  const openDialog = (combo?: Combo) => {
    if (combo) {
      setEditing(combo);
      setForm({ name: combo.name, description: combo.description || "", combo_price: String(combo.combo_price) });
      const items: Record<string, number> = {};
      comboItems.filter((ci) => ci.combo_id === combo.id).forEach((ci) => { items[ci.menu_item_id] = ci.quantity; });
      setSelectedItems(items);
    } else {
      setEditing(null);
      setForm({ name: "", description: "", combo_price: "" });
      setSelectedItems({});
    }
    setDialogOpen(true);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[itemId]) delete copy[itemId];
      else copy[itemId] = 1;
      return copy;
    });
  };

  const setItemQty = (itemId: string, qty: number) => {
    if (qty <= 0) return;
    setSelectedItems((prev) => ({ ...prev, [itemId]: qty }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.combo_price || Object.keys(selectedItems).length === 0) {
      toast.error("Fill name, price and select items"); return;
    }
    let comboId = editing?.id;
    if (editing) {
      await supabase.from("menu_combos").update({
        name: form.name, description: form.description || null, combo_price: parseFloat(form.combo_price),
      } as any).eq("id", editing.id);
      await supabase.from("combo_items").delete().eq("combo_id", editing.id);
    } else {
      const { data } = await supabase.from("menu_combos").insert({
        name: form.name, description: form.description || null, combo_price: parseFloat(form.combo_price),
        owner_id: userId, sort_order: combos.length,
      } as any).select().single();
      comboId = (data as any)?.id;
    }
    if (comboId) {
      const items = Object.entries(selectedItems).map(([menu_item_id, quantity]) => ({
        combo_id: comboId!, menu_item_id, quantity,
      }));
      await supabase.from("combo_items").insert(items as any);
    }
    setDialogOpen(false); toast.success("Combo saved"); fetchData(); onDataChange?.();
  };

  const deleteCombo = async (id: string) => {
    await supabase.from("menu_combos").delete().eq("id", id);
    toast.success("Combo deleted"); fetchData();
  };

  const toggleAvailability = async (combo: Combo) => {
    await supabase.from("menu_combos").update({ is_available: !combo.is_available } as any).eq("id", combo.id);
    fetchData();
  };

  const getItemName = (id: string) => allItems.find((i) => i.id === id)?.name || "Unknown";
  const getOriginalTotal = (comboId: string) => {
    return comboItems.filter((ci) => ci.combo_id === comboId).reduce((sum, ci) => {
      const item = allItems.find((i) => i.id === ci.menu_item_id);
      return sum + (item ? Number(item.price) * ci.quantity : 0);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Package className="w-4 h-4" /> Combos
        </h2>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Add Combo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {combos.map((combo) => {
          const items = comboItems.filter((ci) => ci.combo_id === combo.id);
          const originalTotal = getOriginalTotal(combo.id);
          const savings = originalTotal - combo.combo_price;
          return (
            <div key={combo.id} className={`bg-card rounded-xl border border-border p-4 shadow-card ${!combo.is_available ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{combo.name}</h3>
                  {combo.description && <p className="text-xs text-muted-foreground">{combo.description}</p>}
                </div>
                <Switch checked={combo.is_available} onCheckedChange={() => toggleAvailability(combo)} className="scale-90" />
              </div>
              <div className="space-y-0.5 mb-2">
                {items.map((ci) => (
                  <p key={ci.id} className="text-xs text-muted-foreground">{ci.quantity}x {getItemName(ci.menu_item_id)}</p>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">₹{combo.combo_price}</span>
                  {savings > 0 && (
                    <span className="text-xs text-muted-foreground line-through">₹{originalTotal}</span>
                  )}
                  {savings > 0 && (
                    <span className="text-xs text-green-600 font-medium">Save ₹{savings}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openDialog(combo)} className="p-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteCombo(combo.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {combos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No combos yet</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Combo</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <Input placeholder="Combo name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="number" placeholder="Combo Price (₹)" value={form.combo_price} onChange={(e) => setForm({ ...form, combo_price: e.target.value })} />

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Select Items</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {allItems.map((item) => {
                  const isSelected = !!selectedItems[item.id];
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(item.id)} />
                        <span className={`w-2 h-2 rounded-sm ${item.is_veg ? "bg-green-500" : "bg-red-500"}`} />
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">₹{item.price}</span>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => setItemQty(item.id, (selectedItems[item.id] || 1) - 1)}>-</Button>
                          <span className="w-6 text-center text-xs font-semibold">{selectedItems[item.id]}</span>
                          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => setItemQty(item.id, (selectedItems[item.id] || 1) + 1)}>+</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={save} className="w-full">Save Combo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComboManager;
