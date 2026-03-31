import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Package, AlertTriangle, Pencil, Trash2, Link, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

interface Ingredient {
  id: string;
  owner_id: string;
  name: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RecipeIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_used: number;
  owner_id: string;
}

const UNITS = ["g", "kg", "ml", "L", "pcs", "dozen", "bunch", "packet"];

const OwnerInventory = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "low" | "recipes">("all");

  // Ingredient form
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ name: "", unit: "g", current_stock: "", low_stock_threshold: "10", cost_per_unit: "0" });

  // Stock update
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockIngredient, setStockIngredient] = useState<Ingredient | null>(null);
  const [stockAmount, setStockAmount] = useState("");

  // Recipe mapping
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [recipeMenuItem, setRecipeMenuItem] = useState<string>("");
  const [recipeIngredientId, setRecipeIngredientId] = useState<string>("");
  const [recipeQty, setRecipeQty] = useState("");

  const fetchData = async () => {
    if (!user) return;
    const [ingRes, menuRes, recipeRes] = await Promise.all([
      supabase.from("ingredients").select("*").eq("owner_id", user.id).order("name"),
      supabase.from("menu_items").select("*").eq("owner_id", user.id).order("name"),
      supabase.from("recipe_ingredients").select("*").eq("owner_id", user.id),
    ]);
    if (ingRes.data) setIngredients(ingRes.data as unknown as Ingredient[]);
    if (menuRes.data) setMenuItems(menuRes.data);
    if (recipeRes.data) setRecipeIngredients(recipeRes.data as unknown as RecipeIngredient[]);
  };

  useEffect(() => { fetchData(); }, [user]);

  const lowStockItems = useMemo(() =>
    ingredients.filter(i => i.is_active && i.current_stock <= i.low_stock_threshold),
    [ingredients]
  );

  const openIngredientDialog = (item?: Ingredient) => {
    if (item) {
      setEditingIngredient(item);
      setForm({
        name: item.name, unit: item.unit, current_stock: String(item.current_stock),
        low_stock_threshold: String(item.low_stock_threshold), cost_per_unit: String(item.cost_per_unit),
      });
    } else {
      setEditingIngredient(null);
      setForm({ name: "", unit: "g", current_stock: "", low_stock_threshold: "10", cost_per_unit: "0" });
    }
    setIngredientDialogOpen(true);
  };

  const saveIngredient = async () => {
    if (!user || !form.name.trim()) return;
    const payload = {
      name: form.name.trim(), unit: form.unit,
      current_stock: parseFloat(form.current_stock) || 0,
      low_stock_threshold: parseFloat(form.low_stock_threshold) || 10,
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      owner_id: user.id,
    };
    if (editingIngredient) {
      await supabase.from("ingredients").update(payload).eq("id", editingIngredient.id);
    } else {
      await supabase.from("ingredients").insert(payload);
    }
    setIngredientDialogOpen(false);
    toast.success("Ingredient saved"); fetchData();
  };

  const deleteIngredient = async (id: string) => {
    await supabase.from("ingredients").delete().eq("id", id);
    toast.success("Ingredient deleted"); fetchData();
  };

  const openStockDialog = (item: Ingredient) => {
    setStockIngredient(item); setStockAmount(""); setStockDialogOpen(true);
  };

  const updateStock = async () => {
    if (!stockIngredient || !stockAmount) return;
    const newStock = stockIngredient.current_stock + parseFloat(stockAmount);
    await supabase.from("ingredients").update({ current_stock: Math.max(0, newStock) }).eq("id", stockIngredient.id);
    setStockDialogOpen(false);
    toast.success("Stock updated"); fetchData();
  };

  const addRecipeMapping = async () => {
    if (!user || !recipeMenuItem || !recipeIngredientId || !recipeQty) return;
    const { error } = await supabase.from("recipe_ingredients").insert({
      menu_item_id: recipeMenuItem, ingredient_id: recipeIngredientId,
      quantity_used: parseFloat(recipeQty), owner_id: user.id,
    });
    if (error) {
      if (error.code === "23505") toast.error("This mapping already exists");
      else toast.error("Failed to add mapping");
      return;
    }
    setRecipeDialogOpen(false); setRecipeQty("");
    toast.success("Recipe mapped"); fetchData();
  };

  const deleteRecipeMapping = async (id: string) => {
    await supabase.from("recipe_ingredients").delete().eq("id", id);
    toast.success("Mapping removed"); fetchData();
  };

  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.name || "Unknown";
  const getIngredientUnit = (id: string) => ingredients.find(i => i.id === id)?.unit || "";
  const getMenuItemName = (id: string) => menuItems.find(m => m.id === id)?.name || "Unknown";

  const filteredIngredients = ingredients.filter(i =>
    !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (item: Ingredient) => {
    if (item.current_stock <= 0) return { label: "Out of Stock", class: "bg-destructive/10 text-destructive border-destructive/20" };
    if (item.current_stock <= item.low_stock_threshold) return { label: "Low Stock", class: "bg-warning/10 text-warning border-warning/20" };
    return { label: "In Stock", class: "bg-success/10 text-success border-success/20" };
  };

  const tabs = [
    { key: "all" as const, label: "All Ingredients", count: ingredients.length },
    { key: "low" as const, label: "⚠️ Low Stock", count: lowStockItems.length },
    { key: "recipes" as const, label: "🔗 Recipes", count: recipeIngredients.length },
  ];

  return (
    <OwnerLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Inventory</h1>
          {lowStockItems.length > 0 && (
            <p className="text-sm text-warning flex items-center gap-1 mt-1">
              <AlertTriangle className="w-4 h-4" /> {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} low on stock
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Link className="w-4 h-4 mr-1" /> Map Recipe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Map Ingredient to Dish</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Menu Item</label>
                  <Select value={recipeMenuItem} onValueChange={setRecipeMenuItem}>
                    <SelectTrigger><SelectValue placeholder="Select dish" /></SelectTrigger>
                    <SelectContent>
                      {menuItems.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Ingredient</label>
                  <Select value={recipeIngredientId} onValueChange={setRecipeIngredientId}>
                    <SelectTrigger><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                    <SelectContent>
                      {ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" placeholder="Quantity used per order" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} />
                <Button onClick={addRecipeMapping} className="w-full">Add Mapping</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" onClick={() => openIngredientDialog()}>
            <Plus className="w-4 h-4 mr-1" /> Add Ingredient
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {tabs.map(tab => (
          <Button key={tab.key} variant={activeTab === tab.key ? "default" : "outline"} size="sm"
            onClick={() => setActiveTab(tab.key)} className="whitespace-nowrap">
            {tab.label}
            {tab.count > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{tab.count}</Badge>}
          </Button>
        ))}
      </div>

      {/* ALL / LOW STOCK TAB */}
      {activeTab !== "recipes" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search ingredients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {(activeTab === "low" ? lowStockItems : filteredIngredients).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>{activeTab === "low" ? "No low stock items — sab theek hai! ✅" : "No ingredients added yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(activeTab === "low" ? lowStockItems : filteredIngredients).map(item => {
                const status = getStockStatus(item);
                return (
                  <div key={item.id} className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">₹{item.cost_per_unit}/{item.unit}</p>
                      </div>
                      <Badge className={`border text-xs ${status.class}`}>{status.label}</Badge>
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className="text-2xl font-display font-bold text-foreground">{item.current_stock}</p>
                        <p className="text-xs text-muted-foreground">{item.unit} • Min: {item.low_stock_threshold}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openStockDialog(item)} className="text-xs">
                          + Stock
                        </Button>
                        <button onClick={() => openIngredientDialog(item)}
                          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteIngredient(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* RECIPES TAB */}
      {activeTab === "recipes" && (
        <>
          {recipeIngredients.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
              <Link className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No recipe mappings yet</p>
              <p className="text-sm mt-1">Map ingredients to dishes to auto-track usage</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Group by menu item */}
              {[...new Set(recipeIngredients.map(r => r.menu_item_id))].map(menuItemId => {
                const mappings = recipeIngredients.filter(r => r.menu_item_id === menuItemId);
                return (
                  <div key={menuItemId} className="bg-card rounded-xl border border-border p-4 shadow-card">
                    <p className="font-semibold text-foreground mb-2">🍽️ {getMenuItemName(menuItemId)}</p>
                    <div className="space-y-1.5">
                      {mappings.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-sm bg-accent rounded-lg px-3 py-2">
                          <span className="text-foreground">{getIngredientName(m.ingredient_id)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{m.quantity_used} {getIngredientUnit(m.ingredient_id)}</span>
                            <button onClick={() => deleteRecipeMapping(m.id)}
                              className="text-muted-foreground hover:text-destructive p-1">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Ingredient Dialog */}
      <Dialog open={ingredientDialogOpen} onOpenChange={setIngredientDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingIngredient ? "Edit" : "Add"} Ingredient</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <Input placeholder="Ingredient name (e.g. Tomato)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Unit</label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" placeholder="Current stock" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Low stock alert at" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
              <Input type="number" placeholder="Cost per unit (₹)" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} />
            </div>
            <Button onClick={saveIngredient} className="w-full">Save Ingredient</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Stock — {stockIngredient?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-semibold text-foreground">{stockIngredient?.current_stock} {stockIngredient?.unit}</span>
            </p>
            <Input type="number" placeholder="Amount to add (use negative to deduct)" value={stockAmount}
              onChange={(e) => setStockAmount(e.target.value)} />
            <Button onClick={updateStock} className="w-full">Update Stock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerInventory;
