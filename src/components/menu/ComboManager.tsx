import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, ImagePlus } from "lucide-react";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { compressImageToWebP } from "@/lib/menu-image";
import {
  normalizeUnsignedDecimalInput,
  parsePositiveNumber,
} from "@/lib/number-input";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type Combo = Tables<"menu_combos">;
type ComboItem = Tables<"combo_items">;

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
  const [comboImageFile, setComboImageFile] = useState<File | null>(null);
  const [comboImagePreview, setComboImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: c } = await supabase.from("menu_combos").select("*").eq("owner_id", userId).order("sort_order");
    if (c) {
      setCombos(c);
      const ids = c.map((x) => x.id);
      if (ids.length > 0) {
        const { data: ci } = await supabase.from("combo_items").select("*").in("combo_id", ids);
        if (ci) setComboItems(ci);
      } else {
        setComboItems([]);
      }
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDialog = (combo?: Combo) => {
    if (combo) {
      setEditing(combo);
      setForm({ name: combo.name, description: combo.description || "", combo_price: String(combo.combo_price) });
      setComboImagePreview(combo.image_url || null);
      setComboImageFile(null);
      const items: Record<string, number> = {};
      comboItems.filter((ci) => ci.combo_id === combo.id).forEach((ci) => { items[ci.menu_item_id] = ci.quantity; });
      setSelectedItems(items);
    } else {
      setEditing(null);
      setForm({ name: "", description: "", combo_price: "" });
      setSelectedItems({});
      setComboImageFile(null);
      setComboImagePreview(null);
    }
    setDialogOpen(true);
  };

  const uploadComboImage = async (file: File) => {
    const compressedFile = await compressImageToWebP(file, {
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.82,
    });
    const path = `${userId}/combos/${Date.now()}-${compressedFile.name}`;
    const { error } = await supabase.storage
      .from("menu-photos")
      .upload(path, compressedFile, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
    return data.publicUrl;
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
    setSelectedItems((prev) => ({ ...prev, [itemId]: Math.max(1, Math.floor(qty)) }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.combo_price || Object.keys(selectedItems).length === 0) {
      toast.error("Fill name, price and select items"); return;
    }
    const comboPrice = parsePositiveNumber(form.combo_price);
    if (comboPrice === null) {
      toast.error("Combo price must be greater than 0");
      return;
    }
    setSaving(true);
    let imageUrl = editing?.image_url || null;
    if (!comboImagePreview && editing?.image_url) {
      imageUrl = null;
    }
    if (comboImageFile) {
      try {
        imageUrl = await uploadComboImage(comboImageFile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Combo image upload failed";
        toast.error(message);
        setSaving(false);
        return;
      }
    }
    let comboId = editing?.id;
    try {
      if (editing) {
        const payload: TablesUpdate<"menu_combos"> = {
          name: form.name, description: form.description || null, combo_price: comboPrice, image_url: imageUrl,
        };
        await supabase.from("menu_combos").update(payload).eq("id", editing.id);
        await supabase.from("combo_items").delete().eq("combo_id", editing.id);
      } else {
        const payload: TablesInsert<"menu_combos"> = {
          name: form.name,
          description: form.description || null,
          combo_price: comboPrice,
          image_url: imageUrl,
          owner_id: userId,
          sort_order: combos.length,
        };
        const { data } = await supabase.from("menu_combos").insert({
          ...payload,
        }).select("id").single();
        comboId = data?.id;
      }
      if (comboId) {
        const items: TablesInsert<"combo_items">[] = Object.entries(selectedItems).map(([menu_item_id, quantity]) => ({
          combo_id: comboId!, menu_item_id, quantity,
        }));
        await supabase.from("combo_items").insert(items);
      }
      setDialogOpen(false); setComboImageFile(null); setComboImagePreview(null); toast.success("Combo saved"); fetchData(); onDataChange?.();
    } finally {
      setSaving(false);
    }
  };

  const deleteCombo = async (id: string) => {
    await supabase.from("menu_combos").delete().eq("id", id);
    toast.success("Combo deleted"); fetchData();
  };

  const toggleAvailability = async (combo: Combo) => {
    await supabase.from("menu_combos").update({ is_available: !combo.is_available }).eq("id", combo.id);
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
              {combo.image_url ? (
                <img src={combo.image_url} alt={combo.name} className="mb-3 h-24 w-full rounded-lg object-cover" />
              ) : null}
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
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Combo Price (₹)"
              value={form.combo_price}
              onChange={(e) => setForm({ ...form, combo_price: normalizeUnsignedDecimalInput(e.target.value) })}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Combo Image</p>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setComboImageFile(file);
                    setComboImagePreview(URL.createObjectURL(file));
                  }}
                />
                <span className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  {comboImagePreview ? "Change combo image" : "Upload combo image"}
                </span>
              </label>
              {comboImagePreview ? (
                <div className="space-y-2">
                  <img
                    src={comboImagePreview}
                    alt="Combo preview"
                    className="h-32 w-full rounded-xl border border-border object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setComboImageFile(null);
                      setComboImagePreview(null);
                    }}
                  >
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>

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

            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Save Combo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComboManager;
