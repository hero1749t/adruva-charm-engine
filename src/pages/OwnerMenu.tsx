import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus, Upload } from "lucide-react";
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
    if (itemForm.image) imageUrl = await uploadImage(itemForm.image);

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
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <DialogHeader>
                <DialogTitle>{editingCat ? "Edit" : "Add"} Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Category name (e.g. Starters)" value={catName} onChange={(e) => setCatName(e.target.value)} />
                <Button variant="hero" onClick={saveCategory} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category tabs - horizontal scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <Button variant={!selectedCat ? "default" : "outline"} size="sm" onClick={() => setSelectedCat(null)} className="flex-shrink-0">All</Button>
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-0.5 flex-shrink-0">
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
        <Button variant="hero" size="sm" onClick={() => openItemDialog()} className="mb-4 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      )}

      {!selectedCat && categories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-base">Start by adding a category ya CSV import karo</p>
          <p className="text-sm mt-2">E.g. Starters, Main Course, Beverages</p>
        </div>
      )}

      {/* Items list - single column on mobile, grid on larger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onToggle={toggleAvailability}
            onEdit={openItemDialog}
            onDelete={deleteItem}
          />
        ))}
      </div>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <Input placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            <Input placeholder="Description (optional)" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            <Input type="number" placeholder="Price (₹)" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Vegetarian?</span>
              <Switch checked={itemForm.is_veg} onCheckedChange={(v) => setItemForm({ ...itemForm, is_veg: v })} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted transition-colors">
              <ImagePlus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {itemForm.image ? itemForm.image.name : "Upload photo"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setItemForm({ ...itemForm, image: e.target.files?.[0] || null })} />
            </label>
            <Button variant="hero" onClick={saveItem} className="w-full">Save Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      {user && (
        <CSVImportDialog
          open={csvOpen}
          onOpenChange={setCsvOpen}
          userId={user.id}
          categories={categories}
          onImportComplete={fetchData}
        />
      )}
    </OwnerLayout>
  );
};

export default OwnerMenu;
