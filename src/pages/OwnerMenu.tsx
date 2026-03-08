import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

const OwnerMenu = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Item form
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

  // Category CRUD
  const saveCategory = async () => {
    if (!user || !catName.trim()) return;
    if (editingCat) {
      await supabase.from("menu_categories").update({ name: catName }).eq("id", editingCat.id);
    } else {
      await supabase.from("menu_categories").insert({ name: catName, owner_id: user.id, sort_order: categories.length });
    }
    setCatDialogOpen(false);
    setCatName("");
    setEditingCat(null);
    toast.success("Category saved");
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("menu_categories").delete().eq("id", id);
    toast.success("Category deleted");
    fetchData();
  };

  // Item CRUD
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
    if (itemForm.image) {
      imageUrl = await uploadImage(itemForm.image);
    }

    const payload = {
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price),
      is_veg: itemForm.is_veg,
      image_url: imageUrl,
      category_id: selectedCat,
      owner_id: user.id,
      sort_order: items.length,
    };

    if (editingItem) {
      await supabase.from("menu_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("menu_items").insert(payload);
    }

    setItemDialogOpen(false);
    toast.success("Item saved");
    fetchData();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    fetchData();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    toast.success("Item deleted");
    fetchData();
  };

  const filteredItems = selectedCat ? items.filter((i) => i.category_id === selectedCat) : items;

  return (
    <OwnerLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Menu Manager</h1>
        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => { setCatName(""); setEditingCat(null); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCat ? "Edit" : "Add"} Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input placeholder="Category name (e.g. Starters, Main Course)" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <Button variant="hero" onClick={saveCategory} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <Button variant={!selectedCat ? "default" : "outline"} size="sm" onClick={() => setSelectedCat(null)}>All</Button>
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1">
            <Button
              variant={selectedCat === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCat(cat.id)}
            >
              {cat.name}
            </Button>
            <button
              onClick={() => { setEditingCat(cat); setCatName(cat.name); setCatDialogOpen(true); }}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item button */}
      {selectedCat && (
        <Button variant="hero" size="sm" onClick={() => openItemDialog()} className="mb-4">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      )}

      {!selectedCat && categories.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Start by adding a category</p>
          <p className="text-sm mt-2">E.g. Starters, Main Course, Beverages</p>
        </div>
      )}

      {/* Items grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div key={item.id} className={`bg-card rounded-xl border border-border p-4 shadow-card ${!item.is_available ? "opacity-60" : ""}`}>
            {item.image_url && (
              <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-3" />
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm border ${item.is_veg ? "border-green-600 bg-green-600" : "border-red-600 bg-red-600"}`} />
                  <span className="font-semibold text-foreground">{item.name}</span>
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                <p className="font-display font-bold text-foreground mt-2">₹{item.price}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch checked={item.is_available} onCheckedChange={() => toggleAvailability(item)} />
                <div className="flex gap-1">
                  <button onClick={() => openItemDialog(item)} className="text-muted-foreground hover:text-foreground p-1">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            <Input placeholder="Description (optional)" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            <Input type="number" placeholder="Price (₹)" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Vegetarian?</span>
              <Switch checked={itemForm.is_veg} onCheckedChange={(v) => setItemForm({ ...itemForm, is_veg: v })} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer border border-dashed border-border rounded-lg p-4 hover:bg-muted transition-colors">
              <ImagePlus className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {itemForm.image ? itemForm.image.name : "Upload photo"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setItemForm({ ...itemForm, image: e.target.files?.[0] || null })} />
            </label>
            <Button variant="hero" onClick={saveItem} className="w-full">Save Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerMenu;
