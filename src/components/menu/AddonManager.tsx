import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, X, Cherry } from "lucide-react";

interface AddonManagerProps {
  userId: string;
  menuItemId: string;
}

type AddonGroup = { id: string; name: string; max_selections: number | null; owner_id: string };
type AddonOption = { id: string; addon_group_id: string; name: string; price: number; is_available: boolean };

const AddonManager = ({ userId, menuItemId }: AddonManagerProps) => {
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [options, setOptions] = useState<AddonOption[]>([]);
  const [linkedGroupIds, setLinkedGroupIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingOption, setAddingOption] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState({ name: "", price: "" });

  const fetchData = async () => {
    const { data: g } = await supabase.from("addon_groups").select("*").eq("owner_id", userId).order("sort_order") as any;
    if (g) {
      setGroups(g);
      const ids = g.map((x: any) => x.id);
      if (ids.length > 0) {
        const { data: o } = await supabase.from("addon_options").select("*").in("addon_group_id", ids).order("sort_order") as any;
        if (o) setOptions(o);
      }
    }
    const { data: links } = await supabase.from("menu_item_addon_groups").select("addon_group_id").eq("menu_item_id", menuItemId) as any;
    if (links) setLinkedGroupIds(links.map((l: any) => l.addon_group_id));
  };

  useEffect(() => { fetchData(); }, [userId, menuItemId]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    await supabase.from("addon_groups").insert({ name: newGroupName.trim(), owner_id: userId, sort_order: groups.length } as any);
    setNewGroupName(""); toast.success("Addon group created"); fetchData();
  };

  const toggleGroupLink = async (groupId: string) => {
    if (linkedGroupIds.includes(groupId)) {
      await supabase.from("menu_item_addon_groups").delete().eq("menu_item_id", menuItemId).eq("addon_group_id", groupId);
      setLinkedGroupIds((prev) => prev.filter((id) => id !== groupId));
    } else {
      await supabase.from("menu_item_addon_groups").insert({ menu_item_id: menuItemId, addon_group_id: groupId } as any);
      setLinkedGroupIds((prev) => [...prev, groupId]);
    }
  };

  const addOption = async (groupId: string) => {
    if (!optionForm.name.trim() || !optionForm.price) return;
    const groupOpts = options.filter((o) => o.addon_group_id === groupId);
    await supabase.from("addon_options").insert({
      addon_group_id: groupId, name: optionForm.name.trim(), price: parseFloat(optionForm.price), sort_order: groupOpts.length,
    } as any);
    setOptionForm({ name: "", price: "" }); setAddingOption(null);
    toast.success("Addon added"); fetchData();
  };

  const deleteOption = async (id: string) => {
    await supabase.from("addon_options").delete().eq("id", id);
    fetchData();
  };

  const deleteGroup = async (id: string) => {
    await supabase.from("addon_groups").delete().eq("id", id);
    toast.success("Group deleted"); fetchData();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Cherry className="w-3.5 h-3.5" /> Addon Groups
      </p>
      <p className="text-xs text-muted-foreground">Check groups to link them to this item</p>

      {groups.map((group) => {
        const isLinked = linkedGroupIds.includes(group.id);
        const groupOpts = options.filter((o) => o.addon_group_id === group.id);
        return (
          <div key={group.id} className={`border rounded-lg p-3 space-y-2 transition-colors ${isLinked ? "border-primary/50 bg-primary/5" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox checked={isLinked} onCheckedChange={() => toggleGroupLink(group.id)} />
                <span className="text-sm font-semibold text-foreground">{group.name}</span>
                {group.max_selections && <span className="text-[10px] text-muted-foreground">Max {group.max_selections}</span>}
              </div>
              <button onClick={() => deleteGroup(group.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {groupOpts.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5 text-sm">
                  <span>{opt.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">+₹{opt.price}</span>
                    <button onClick={() => deleteOption(opt.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {addingOption === group.id ? (
              <div className="flex gap-2">
                <Input value={optionForm.name} onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })} placeholder="e.g. Extra Cheese" className="h-8 text-sm flex-1" />
                <Input type="number" value={optionForm.price} onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })} placeholder="₹" className="h-8 text-sm w-20" />
                <Button size="sm" className="h-8" onClick={() => addOption(group.id)}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingOption(null)}>✕</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => { setAddingOption(group.id); setOptionForm({ name: "", price: "" }); }}>
                <Plus className="w-3 h-3 mr-1" /> Add Addon
              </Button>
            )}
          </div>
        );
      })}

      <div className="flex gap-2">
        <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Extra Toppings" className="h-8 text-sm flex-1" />
        <Button size="sm" className="h-8" onClick={createGroup}>
          <Plus className="w-3 h-3 mr-1" /> Group
        </Button>
      </div>
    </div>
  );
};

export default AddonManager;
