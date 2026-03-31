import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerPlan } from "@/hooks/useOwnerPlan";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus, Upload, Search } from "lucide-react";
import MenuItemCard from "@/components/menu/MenuItemCard";
import CSVImportDialog from "@/components/menu/CSVImportDialog";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

const OwnerMenu = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", is_veg: true, image: null as File | null,
  });

  const fetchData = async () => {
    if (!user) return;
    const [catRes, itemRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("owner_id", user.id).order("sort_order"),
      supabase.from("menu_items").select("*").eq("owner_id", user.id).order("sort_order"),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (itemRes.data) setItems(itemRes.data);
  };

  useEffect(() => { fetchData(); }, [user]);

  const saveCategory = async () => {
    if (!user || !catName.trim()) return;
    if (editingCat) {
      await supabase.from("menu_categories").update({ name: catName }).eq("id", editingCat.id);
    } else {
      await supabase.from("menu_categories").insert({ name: catName, owner_id: user.id, sort_order: categories.length });
    }
    setCatDialogOpen(false); setCatName(""); setEditingCat(null);
    toast.success("Category saved"); fetchData();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("menu_categories").delete().eq("id", id);
    if (selectedCat === id) setSelectedCat(null);
    toast.success("Category deleted"); fetchData();
  };

  const openItemDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ name: item.name, description: item.description || "", price: String(item.price), is_veg: item.is_veg, image: null });
    } else {
      setEditingItem(null);
      setItemForm({ name: "", description: "", price: "", is_veg: true, image: null });
    }
    setItemDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-photos").upload(path, file);
    if (error) { toast.error("Image upload failed"); return null; }
    const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveItem = async () => {
    if (!user || !selectedCat || !itemForm.name || !itemForm.price) return;
    let imageUrl = editingItem?.image_url || null;
    if (itemForm.image) imageUrl = await uploadImage(itemForm.image);
    const payload = {
      name: itemForm.name, description: itemForm.description || null,
      price: parseFloat(itemForm.price), is_veg: itemForm.is_veg,
      image_url: imageUrl, category_id: selectedCat, owner_id: user.id, sort_order: items.length,
    };
    if (editingItem) {
      await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("menu_items").insert(payload);
    }
    setItemDialogOpen(false); toast.success("Item saved"); fetchData();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    fetchData();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    toast.success("Item deleted"); fetchData();
  };

  const filteredItems = (selectedCat ? items.filter((i) => i.category_id === selectedCat) : items)
    .filter((i) => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getCategoryItemCount = (catId: string) => items.filter(i => i.category_id === catId).length;

  return (
    <OwnerLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Menu Manager</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { setCatName(""); setEditingCat(null); }}>
                <Plus className="w-4 h-4 mr-1" /> Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCat ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Category name (e.g. Starters)" value={catName} onChange={(e) => setCatName(e.target.value)} />
                <Button onClick={saveCategory} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Category sidebar (desktop) */}
        <div className="hidden md:block w-[220px] flex-shrink-0">
          <div className="bg-card rounded-xl border border-border p-3 sticky top-20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Categories</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedCat(null)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  !selectedCat ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                }`}
              >
                All Items
                <span className="ml-auto float-right text-xs opacity-70">{items.length}</span>
              </button>
              {categories.map((cat) => (
                <div key={cat.id} className="group flex items-center">
                  <button
                    onClick={() => setSelectedCat(cat.id)}
                    className={`flex-1 text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCat === cat.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {cat.name}
                    <span className="ml-2 text-xs opacity-70">{getCategoryItemCount(cat.id)}</span>
                  </button>
                  <div className="hidden group-hover:flex gap-0.5 pr-1">
                    <button onClick={() => { setEditingCat(cat); setCatName(cat.name); setCatDialogOpen(true); }}
                      className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => deleteCategory(cat.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: Category horizontal scroll */}
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-background border-b border-border px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <Button variant={!selectedCat ? "default" : "outline"} size="sm" onClick={() => setSelectedCat(null)} className="flex-shrink-0">All</Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCat === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCat(cat.id)}
                className="flex-shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Center: Items */}
        <div className="flex-1 md:mt-0 mt-14">
          {/* Search + Add */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedCat && (
              <Button onClick={() => openItemDialog()} className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            )}
          </div>

          {!selectedCat && categories.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
              <p className="text-base">Start by adding a category ya CSV import karo</p>
              <p className="text-sm mt-2">E.g. Starters, Main Course, Beverages</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onToggle={toggleAvailability} onEdit={openItemDialog} onDelete={deleteItem} />
            ))}
          </div>

          {filteredItems.length === 0 && (selectedCat || searchQuery) && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">{searchQuery ? "No items match your search" : "No items in this category"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Edit" : "Add"} Menu Item</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <Input placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            <Input placeholder="Description (optional)" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            <Input type="number" placeholder="Price (₹)" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Vegetarian?</span>
              <Switch checked={itemForm.is_veg} onCheckedChange={(v) => setItemForm({ ...itemForm, is_veg: v })} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-accent transition-colors">
              <ImagePlus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{itemForm.image ? itemForm.image.name : "Upload photo"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setItemForm({ ...itemForm, image: e.target.files?.[0] || null })} />
            </label>
            <Button onClick={saveItem} className="w-full">Save Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      {user && <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} userId={user.id} categories={categories} onImportComplete={fetchData} />}
    </OwnerLayout>
  );
};

export default OwnerMenu;
