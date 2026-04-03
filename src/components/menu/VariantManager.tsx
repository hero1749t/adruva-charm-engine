import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, X, Layers } from "lucide-react";
import {
  normalizeUnsignedDecimalInput,
  parseNonNegativeNumber,
} from "@/lib/number-input";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

interface VariantManagerProps {
  userId: string;
  menuItemId: string;
}

type VariantGroup = Tables<"variant_groups">;
type VariantOption = Tables<"variant_options">;

const VariantManager = ({ userId, menuItemId }: VariantManagerProps) => {
  const [groups, setGroups] = useState<VariantGroup[]>([]);
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingOption, setAddingOption] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({ name: "", price: "" });

  const fetchData = useCallback(async () => {
    const { data: g } = await supabase.from("variant_groups").select("*").eq("menu_item_id", menuItemId).order("sort_order");
    if (g) {
      setGroups(g);
      const ids = g.map((x) => x.id);
      if (ids.length > 0) {
        const { data: o } = await supabase.from("variant_options").select("*").in("variant_group_id", ids).order("sort_order");
        if (o) setOptions(o);
      } else {
        setOptions([]);
      }
    }
  }, [menuItemId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    const payload: TablesInsert<"variant_groups"> = {
      name: newGroupName.trim(), menu_item_id: menuItemId, owner_id: userId, sort_order: groups.length,
    };
    await supabase.from("variant_groups").insert(payload);
    setNewGroupName(""); toast.success("Variant group added"); fetchData();
  };

  const deleteGroup = async (id: string) => {
    await supabase.from("variant_groups").delete().eq("id", id);
    toast.success("Group deleted"); fetchData();
  };

  const toggleRequired = async (group: VariantGroup) => {
    await supabase.from("variant_groups").update({ is_required: !group.is_required }).eq("id", group.id);
    fetchData();
  };

  const addOption = async (groupId: string) => {
    if (!optionForm.name.trim() || optionForm.price === "") return;
    const price = parseNonNegativeNumber(optionForm.price);
    if (price === null) {
      toast.error("Option price cannot be negative");
      return;
    }
    const groupOptions = options.filter((o) => o.variant_group_id === groupId);
    const payload: TablesInsert<"variant_options"> = {
      variant_group_id: groupId, name: optionForm.name.trim(), price, sort_order: groupOptions.length,
    };
    await supabase.from("variant_options").insert(payload);
    setOptionForm({ name: "", price: "" }); setAddingOption(null);
    toast.success("Option added"); fetchData();
  };

  const deleteOption = async (id: string) => {
    await supabase.from("variant_options").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" /> Variant Groups
      </p>

      {groups.map((group) => {
        const groupOpts = options.filter((o) => o.variant_group_id === group.id);
        return (
          <div key={group.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{group.name}</span>
                <span className="text-[10px] text-muted-foreground">{group.is_required ? "Required" : "Optional"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={group.is_required} onCheckedChange={() => toggleRequired(group)} className="scale-75" />
                <button onClick={() => deleteGroup(group.id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {groupOpts.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5 text-sm">
                  <span>{opt.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">₹{opt.price}</span>
                    <button onClick={() => deleteOption(opt.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {addingOption === group.id ? (
              <div className="flex gap-2">
                <Input value={optionForm.name} onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })} placeholder="e.g. Medium" className="h-8 text-sm flex-1" />
                <Input type="number" min="0" step="0.01" value={optionForm.price} onChange={(e) => setOptionForm({ ...optionForm, price: normalizeUnsignedDecimalInput(e.target.value) })} placeholder="₹" className="h-8 text-sm w-20" />
                <Button size="sm" className="h-8" onClick={() => addOption(group.id)}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingOption(null)}>✕</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => { setAddingOption(group.id); setOptionForm({ name: "", price: "" }); }}>
                <Plus className="w-3 h-3 mr-1" /> Add Option
              </Button>
            )}
          </div>
        );
      })}

      <div className="flex gap-2">
        <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Size, Crust Type" className="h-8 text-sm flex-1" />
        <Button size="sm" className="h-8" onClick={addGroup}>
          <Plus className="w-3 h-3 mr-1" /> Group
        </Button>
      </div>
    </div>
  );
};

export default VariantManager;
