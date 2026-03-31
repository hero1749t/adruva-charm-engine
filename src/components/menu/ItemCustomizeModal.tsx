import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Check } from "lucide-react";

interface VariantGroup {
  id: string;
  name: string;
  is_required: boolean;
  sort_order: number;
  options: { id: string; name: string; price: number; sort_order: number }[];
}

interface AddonGroup {
  id: string;
  name: string;
  max_selections: number | null;
  sort_order: number;
  options: { id: string; name: string; price: number; is_available: boolean; sort_order: number }[];
}

export interface SelectedVariant {
  groupName: string;
  optionName: string;
  price: number;
}

export interface SelectedAddon {
  groupName: string;
  optionName: string;
  price: number;
}

interface Props {
  item: { id: string; name: string; price: number; image_url: string | null; is_veg: boolean; description: string | null };
  ownerId: string;
  onClose: () => void;
  onAdd: (variants: SelectedVariant[], addons: SelectedAddon[], totalExtra: number) => void;
  menuStyle?: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
    accent_color: string;
    font_heading: string;
    font_body: string;
  } | null;
}

const ItemCustomizeModal = ({ item, ownerId, onClose, onAdd, menuStyle }: Props) => {
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  const cm = !!menuStyle;

  useEffect(() => {
    const fetchData = async () => {
      // Fetch variant groups + options
      const { data: vGroups } = await supabase
        .from("variant_groups")
        .select("id, name, is_required, sort_order")
        .eq("menu_item_id", item.id)
        .eq("owner_id", ownerId)
        .order("sort_order");

      if (vGroups && vGroups.length > 0) {
        const { data: vOptions } = await supabase
          .from("variant_options")
          .select("id, name, price, sort_order, variant_group_id")
          .in("variant_group_id", vGroups.map(g => g.id))
          .order("sort_order");

        const groups: VariantGroup[] = vGroups.map(g => ({
          ...g,
          options: (vOptions || []).filter(o => o.variant_group_id === g.id),
        }));
        setVariantGroups(groups);

        // Auto-select first option of required groups
        const defaults: Record<string, string> = {};
        groups.forEach(g => {
          if (g.is_required && g.options.length > 0) {
            defaults[g.id] = g.options[0].id;
          }
        });
        setSelectedVariants(defaults);
      }

      // Fetch addon groups linked to this item
      const { data: links } = await supabase
        .from("menu_item_addon_groups")
        .select("addon_group_id")
        .eq("menu_item_id", item.id);

      if (links && links.length > 0) {
        const groupIds = links.map(l => l.addon_group_id);
        const { data: aGroups } = await supabase
          .from("addon_groups")
          .select("id, name, max_selections, sort_order")
          .in("id", groupIds)
          .order("sort_order");

        if (aGroups && aGroups.length > 0) {
          const { data: aOptions } = await supabase
            .from("addon_options")
            .select("id, name, price, is_available, sort_order, addon_group_id")
            .in("addon_group_id", aGroups.map(g => g.id))
            .eq("is_available", true)
            .order("sort_order");

          const groups: AddonGroup[] = aGroups.map(g => ({
            ...g,
            options: (aOptions || []).filter(o => o.addon_group_id === g.id),
          }));
          setAddonGroups(groups);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [item.id, ownerId]);

  const toggleAddon = (groupId: string, optionId: string, maxSel: number | null) => {
    setSelectedAddons(prev => {
      const current = new Set(prev[groupId] || []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        if (maxSel && current.size >= maxSel) return prev;
        current.add(optionId);
      }
      return { ...prev, [groupId]: current };
    });
  };

  // Calculate extra price
  const variantExtra = variantGroups.reduce((sum, g) => {
    const selectedOpt = g.options.find(o => o.id === selectedVariants[g.id]);
    return sum + (selectedOpt ? Number(selectedOpt.price) : 0);
  }, 0);

  const addonExtra = addonGroups.reduce((sum, g) => {
    const selected = selectedAddons[g.id] || new Set();
    return sum + g.options.filter(o => selected.has(o.id)).reduce((s, o) => s + Number(o.price), 0);
  }, 0);

  const totalPrice = Number(item.price) + variantExtra + addonExtra;

  // Check if all required variants are selected
  const allRequiredSelected = variantGroups
    .filter(g => g.is_required)
    .every(g => selectedVariants[g.id]);

  const handleAdd = () => {
    const variants: SelectedVariant[] = Object.entries(selectedVariants).map(([gId, oId]) => {
      const group = variantGroups.find(g => g.id === gId)!;
      const option = group.options.find(o => o.id === oId)!;
      return { groupName: group.name, optionName: option.name, price: Number(option.price) };
    });

    const addons: SelectedAddon[] = [];
    Object.entries(selectedAddons).forEach(([gId, optionIds]) => {
      const group = addonGroups.find(g => g.id === gId)!;
      optionIds.forEach(oId => {
        const option = group.options.find(o => o.id === oId)!;
        addons.push({ groupName: group.name, optionName: option.name, price: Number(option.price) });
      });
    });

    onAdd(variants, addons, variantExtra + addonExtra);
  };

  const hasCustomizations = variantGroups.length > 0 || addonGroups.length > 0;

  // If no customizations, auto-add immediately
  useEffect(() => {
    if (!loading && !hasCustomizations) {
      onAdd([], [], 0);
    }
  }, [loading, hasCustomizations]);

  if (loading || !hasCustomizations) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5"
        style={cm ? { backgroundColor: menuStyle!.background_color, color: menuStyle!.text_color, fontFamily: menuStyle!.font_body } : undefined}
        onClick={e => e.stopPropagation()}
      >
        {!cm && <div className="absolute inset-0 bg-card rounded-t-3xl -z-10" />}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={cm ? { backgroundColor: menuStyle!.accent_color + "40" } : undefined} />
        {!cm && <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 absolute top-5 left-1/2 -translate-x-1/2" />}

        {/* Item header */}
        <div className="flex items-center gap-3 mb-5">
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 ${item.is_veg ? "border-green-600" : "border-red-500"}`}>
                <span className={`block w-1.5 h-1.5 rounded-full m-auto mt-[1px] ${item.is_veg ? "bg-green-600" : "bg-red-500"}`} />
              </span>
              <h3 className="font-bold text-lg" style={cm ? { fontFamily: menuStyle!.font_heading } : undefined}>{item.name}</h3>
            </div>
            {item.description && <p className="text-xs opacity-60 mt-0.5">{item.description}</p>}
            <p className="font-bold mt-1" style={cm ? { fontFamily: menuStyle!.font_heading } : undefined}>₹{item.price}</p>
          </div>
          <button onClick={onClose} className="p-1 opacity-60 hover:opacity-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variant groups */}
        {variantGroups.map(group => (
          <div key={group.id} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm" style={cm ? { fontFamily: menuStyle!.font_heading } : undefined}>
                {group.name}
              </h4>
              {group.is_required && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={cm ? { backgroundColor: menuStyle!.primary_color + "20", color: menuStyle!.primary_color } : undefined}
                >
                  {!cm && <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">Required</span>}
                  {cm && "Required"}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {group.options.map(opt => {
                const isSelected = selectedVariants[group.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedVariants(p => ({ ...p, [group.id]: opt.id }))}
                    className="w-full flex items-center justify-between p-3 rounded-xl border transition-all"
                    style={cm ? {
                      borderColor: isSelected ? menuStyle!.primary_color : menuStyle!.accent_color + "30",
                      backgroundColor: isSelected ? menuStyle!.primary_color + "10" : "transparent",
                    } : undefined}
                  >
                    {!cm && <div className={`absolute inset-0 rounded-xl border ${isSelected ? "border-primary bg-primary/5" : "border-border"}`} />}
                    <div className="flex items-center gap-2.5 relative">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={cm ? { borderColor: isSelected ? menuStyle!.primary_color : menuStyle!.accent_color + "50" } : undefined}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full"
                            style={cm ? { backgroundColor: menuStyle!.primary_color } : undefined}
                          />
                        )}
                        {isSelected && !cm && <div className="w-3 h-3 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{opt.name}</span>
                    </div>
                    <span className="text-sm font-semibold relative" style={cm ? { color: menuStyle!.primary_color } : undefined}>
                      {Number(opt.price) > 0 ? `+₹${opt.price}` : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Addon groups */}
        {addonGroups.map(group => (
          <div key={group.id} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm" style={cm ? { fontFamily: menuStyle!.font_heading } : undefined}>
                {group.name}
              </h4>
              {group.max_selections && (
                <span className="text-[10px] opacity-60">Max {group.max_selections}</span>
              )}
            </div>
            <div className="space-y-2">
              {group.options.map(opt => {
                const isSelected = selectedAddons[group.id]?.has(opt.id) || false;
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleAddon(group.id, opt.id, group.max_selections)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border transition-all"
                    style={cm ? {
                      borderColor: isSelected ? menuStyle!.primary_color : menuStyle!.accent_color + "30",
                      backgroundColor: isSelected ? menuStyle!.primary_color + "10" : "transparent",
                    } : undefined}
                  >
                    {!cm && <div className={`absolute inset-0 rounded-xl border ${isSelected ? "border-primary bg-primary/5" : "border-border"}`} />}
                    <div className="flex items-center gap-2.5 relative">
                      <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                        style={cm ? { borderColor: isSelected ? menuStyle!.primary_color : menuStyle!.accent_color + "50", backgroundColor: isSelected ? menuStyle!.primary_color : "transparent" } : undefined}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        {!cm && !isSelected && <div className="w-5 h-5 rounded-md border-2 border-border" />}
                        {!cm && isSelected && <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-primary-foreground" /></div>}
                      </div>
                      <span className="text-sm font-medium">{opt.name}</span>
                    </div>
                    <span className="text-sm font-semibold relative" style={cm ? { color: menuStyle!.primary_color } : undefined}>
                      +₹{opt.price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Add button */}
        <div className="sticky bottom-0 pt-3 pb-2" style={cm ? { backgroundColor: menuStyle!.background_color } : undefined}>
          {!cm && <div className="absolute inset-0 bg-card" />}
          <button
            onClick={handleAdd}
            disabled={!allRequiredSelected}
            className="relative w-full py-3.5 rounded-xl font-bold text-base text-white disabled:opacity-50 transition-all"
            style={cm ? { backgroundColor: menuStyle!.primary_color, fontFamily: menuStyle!.font_heading } : undefined}
          >
            {!cm && <div className="absolute inset-0 bg-primary rounded-xl" />}
            <span className="relative">Add to Cart — ₹{totalPrice}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ItemCustomizeModal;
