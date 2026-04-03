import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  GripVertical,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import OwnerLayout from "@/components/OwnerLayout";
import PlanUsageBadge from "@/components/PlanUsageBadge";
import CSVImportDialog from "@/components/menu/CSVImportDialog";
import ComboManager from "@/components/menu/ComboManager";
import TagManager from "@/components/menu/TagManager";
import VariantManager from "@/components/menu/VariantManager";
import AddonManager from "@/components/menu/AddonManager";
import MenuItemCard from "@/components/menu/MenuItemCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useOwnerPlan } from "@/hooks/useOwnerPlan";
import { compressImageToWebP } from "@/lib/menu-image";
import {
  normalizeUnsignedDecimalInput,
  normalizeUnsignedIntegerInput,
  parseNonNegativeNumber,
  parsePositiveNumber,
} from "@/lib/number-input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["menu_categories"]["Insert"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
type MenuItemUpdate = Database["public"]["Tables"]["menu_items"]["Update"];

interface CategoryFormValues {
  name: string;
}

interface ItemFormValues {
  name: string;
  description: string;
  price: string;
  original_price: string;
  category_id: string;
  is_veg: boolean;
  is_featured: boolean;
  is_available: boolean;
  tax_type: "inclusive" | "exclusive";
  stock_quantity: string;
  low_stock_threshold: string;
  available_from: string;
  available_to: string;
}

const createEmptyItemValues = (categoryId = ""): ItemFormValues => ({
  name: "",
  description: "",
  price: "",
  original_price: "",
  category_id: categoryId,
  is_veg: true,
  is_featured: false,
  is_available: true,
  tax_type: "inclusive",
  stock_quantity: "",
  low_stock_threshold: "",
  available_from: "",
  available_to: "",
});

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const getTimePreview = (from: string, to: string) => {
  if (!from && !to) return "";

  const formatPart = (value: string) => {
    if (!value) return "Any time";
    const [hourString, minuteString] = value.split(":");
    const date = new Date();

    date.setHours(Number(hourString), Number(minuteString), 0, 0);
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return `${formatPart(from)} - ${formatPart(to)}`;
};

const getStockPreviewClass = (
  stockQuantity: string,
  lowStockThreshold: string,
) => {
  if (!stockQuantity) {
    return "border-border text-muted-foreground";
  }

  const stock = Number(stockQuantity);
  const threshold = Number(lowStockThreshold || "0");

  if (stock <= 0) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (lowStockThreshold && stock <= threshold) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
};

const buildStoragePath = (
  ownerId: string,
  folder: "categories" | "items",
  fileName: string,
) => `${ownerId}/${folder}/${Date.now()}-${fileName}`;

const OwnerMenu = () => {
  const { user } = useAuth();
  const { plan } = useOwnerPlan();
  const queryClient = useQueryClient();

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<MenuItem | null>(null);

  const categoryForm = useForm<CategoryFormValues>({
    defaultValues: { name: "" },
  });

  const itemForm = useForm<ItemFormValues>({
    defaultValues: createEmptyItemValues(),
  });

  const categoryQuery = useQuery({
    queryKey: ["owner-menu-categories", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("owner_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data satisfies Category[];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["owner-menu-items", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("owner_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data satisfies MenuItem[];
    },
  });

  const categories = useMemo(() => categoryQuery.data ?? [], [categoryQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  useEffect(() => {
    if (selectedCat && !categories.some((category) => category.id === selectedCat)) {
      setSelectedCat(null);
    }
  }, [categories, selectedCat]);

  const resetCategoryImageState = (preview: string | null = null) => {
    setCategoryImageFile(null);
    setCategoryImagePreview(preview);
  };

  const resetItemImageState = (preview: string | null = null) => {
    setItemImageFile(null);
    setItemImagePreview(preview);
  };

  const uploadImage = async (
    file: File,
    folder: "categories" | "items",
  ) => {
    if (!user) return null;
    const compressedFile = await compressImageToWebP(file, {
      maxWidth: folder === "categories" ? 900 : 1600,
      maxHeight: folder === "categories" ? 900 : 1600,
      quality: folder === "categories" ? 0.8 : 0.82,
    });
    const path = buildStoragePath(user.id, folder, compressedFile.name);
    const { error } = await supabase.storage
      .from("menu-photos")
      .upload(path, compressedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const invalidateMenuData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["owner-menu-categories", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["owner-menu-items", user?.id] }),
    ]);
  };

  const saveCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      if (!user) throw new Error("You must be logged in");

      let imageUrl = editingCat?.image_url ?? null;
      if (categoryImageFile) {
        imageUrl = await uploadImage(categoryImageFile, "categories");
      }

      if (editingCat) {
        const { error } = await supabase
          .from("menu_categories")
          .update({
            name: values.name.trim(),
            image_url: imageUrl,
          })
          .eq("id", editingCat.id);

        if (error) throw error;
        return;
      }

      const payload: CategoryInsert = {
        owner_id: user.id,
        name: values.name.trim(),
        image_url: imageUrl,
        sort_order: categories.length,
      };
      const { error } = await supabase.from("menu_categories").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateMenuData();
      setCatDialogOpen(false);
      setEditingCat(null);
      categoryForm.reset({ name: "" });
      resetCategoryImageState();
      toast.success("Category saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save category");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      const { error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
    },
    onSuccess: async (_, category) => {
      if (selectedCat === category.id) {
        setSelectedCat(null);
      }
      setCategoryPendingDelete(null);
      await invalidateMenuData();
      toast.success("Category deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete category");
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async (orderedCategories: Category[]) => {
      const updates = orderedCategories.map((category, index) =>
        supabase
          .from("menu_categories")
          .update({ sort_order: index })
          .eq("id", category.id),
      );

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        throw failed.error;
      }
    },
    onSuccess: async () => {
      await invalidateMenuData();
      toast.success("Category order updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not reorder categories");
    },
  });

  const saveItemMutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      if (!user) throw new Error("You must be logged in");
      if (!values.category_id) throw new Error("Please choose a category");

      const price = parsePositiveNumber(values.price);
      const originalPrice = values.original_price
        ? parseNonNegativeNumber(values.original_price)
        : null;
      const stockQuantity = values.stock_quantity
        ? parseNonNegativeNumber(values.stock_quantity)
        : null;
      const lowStockThreshold = values.low_stock_threshold
        ? parseNonNegativeNumber(values.low_stock_threshold)
        : null;

      if (price === null) throw new Error("Selling price must be greater than 0");
      if (values.original_price && originalPrice === null) {
        throw new Error("Original price cannot be negative");
      }
      if (values.stock_quantity && stockQuantity === null) {
        throw new Error("Stock quantity cannot be negative");
      }
      if (values.low_stock_threshold && lowStockThreshold === null) {
        throw new Error("Low stock threshold cannot be negative");
      }

      if (!editingItem && plan.hasPlan && items.length >= plan.maxMenuItems) {
        throw new Error(
          `Your ${plan.planName} plan allows max ${plan.maxMenuItems} menu items. Upgrade to add more.`,
        );
      }

      let imageUrl = editingItem?.image_url ?? null;
      if (itemImageFile) {
        imageUrl = await uploadImage(itemImageFile, "items");
      }

      const payload: MenuItemInsert | MenuItemUpdate = {
        owner_id: user.id,
        category_id: values.category_id,
        name: values.name.trim(),
        description: values.description.trim() || null,
        price,
        original_price: originalPrice,
        is_veg: values.is_veg,
        is_featured: values.is_featured,
        image_url: imageUrl,
        is_available: values.is_available,
        tax_type: values.tax_type,
        stock_quantity: stockQuantity,
        low_stock_threshold: lowStockThreshold,
        available_from: values.available_from || null,
        available_to: values.available_to || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        return;
      }

      const insertPayload: MenuItemInsert = {
        ...(payload as MenuItemInsert),
        sort_order: items.filter((item) => item.category_id === values.category_id).length,
      };
      const { error } = await supabase.from("menu_items").insert(insertPayload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateMenuData();
      setItemDialogOpen(false);
      setEditingItem(null);
      resetItemImageState();
      itemForm.reset(
        createEmptyItemValues(selectedCat ?? categories[0]?.id ?? ""),
      );
      toast.success("Menu item saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save menu item");
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (item: MenuItem) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !item.is_available })
        .eq("id", item.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateMenuData();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update availability");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (item: MenuItem) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setItemPendingDelete(null);
      await invalidateMenuData();
      toast.success("Item deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete item");
    },
  });

  const openCategoryDialog = (category?: Category) => {
    setEditingCat(category ?? null);
    categoryForm.reset({ name: category?.name ?? "" });
    resetCategoryImageState(category?.image_url ?? null);
    setCatDialogOpen(true);
  };

  const openItemDialog = (item?: MenuItem) => {
    if (!categories.length) {
      toast.error("Add a category first");
      return;
    }

    setEditingItem(item ?? null);
    resetItemImageState(item?.image_url ?? null);
    itemForm.reset(
      item
        ? {
            name: item.name,
            description: item.description ?? "",
            price: String(item.price),
            original_price: item.original_price ? String(item.original_price) : "",
            category_id: item.category_id,
            is_veg: item.is_veg,
            is_featured: item.is_featured,
            is_available: item.is_available,
            tax_type:
              item.tax_type === "exclusive" ? "exclusive" : "inclusive",
            stock_quantity:
              item.stock_quantity === null ? "" : String(item.stock_quantity),
            low_stock_threshold:
              item.low_stock_threshold === null
                ? ""
                : String(item.low_stock_threshold),
            available_from: item.available_from ?? "",
            available_to: item.available_to ?? "",
          }
        : createEmptyItemValues(selectedCat ?? categories[0]?.id ?? ""),
    );
    setItemDialogOpen(true);
  };

  const handleCategoryImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (categoryImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(categoryImagePreview);
    }
    setCategoryImageFile(file);
    setCategoryImagePreview(URL.createObjectURL(file));
  };

  const handleItemImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (itemImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(itemImagePreview);
    }
    setItemImageFile(file);
    setItemImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (categoryImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(categoryImagePreview);
      }
      if (itemImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(itemImagePreview);
      }
    };
  }, [categoryImagePreview, itemImagePreview]);

  const filteredItems = useMemo(() => {
    const visibleItems = selectedCat
      ? items.filter((item) => item.category_id === selectedCat)
      : items;

    if (!searchQuery) return visibleItems;

    const normalizedQuery = searchQuery.toLowerCase();
    return visibleItems.filter((item) =>
      [item.name, item.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [items, searchQuery, selectedCat]);

  const getCategoryItemCount = (categoryId: string) =>
    items.filter((item) => item.category_id === categoryId).length;

  const handleCategoryDrop = (targetCategoryId: string) => {
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) return;
    const ordered = [...categories];
    const draggedIndex = ordered.findIndex(
      (category) => category.id === draggedCategoryId,
    );
    const targetIndex = ordered.findIndex(
      (category) => category.id === targetCategoryId,
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedCategory] = ordered.splice(draggedIndex, 1);
    ordered.splice(targetIndex, 0, draggedCategory);
    setDraggedCategoryId(null);
    void reorderCategoriesMutation.mutateAsync(ordered);
  };

  const itemValues = itemForm.watch();
  const isLoading = categoryQuery.isLoading || itemsQuery.isLoading;
  const comboDataRefresh = () => {
    void invalidateMenuData();
  };

  return (
    <OwnerLayout>
      <div className="mb-4">
        <PlanUsageBadge
          current={items.length}
          max={plan.maxMenuItems}
          label="Menu Items Used"
          hasPlan={plan.hasPlan}
          planName={plan.planName}
        />
      </div>

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Menu Manager
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage categories, item pricing, stock visibility, and operational
            timings from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Import CSV
          </Button>

          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openCategoryDialog()}>
                <Plus className="mr-1 h-4 w-4" /> Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCat ? "Edit Category" : "Add Category"}
                </DialogTitle>
              </DialogHeader>

              <Form {...categoryForm}>
                <form
                  onSubmit={categoryForm.handleSubmit((values) =>
                    saveCategoryMutation.mutate(values),
                  )}
                  className="space-y-4"
                >
                  <div className="flex flex-col items-center gap-3">
                    <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-muted transition-colors hover:border-primary">
                      {categoryImagePreview ? (
                        <img
                          src={categoryImagePreview}
                          alt="Category preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 hidden items-center justify-center bg-black/45 text-xs font-medium text-white group-hover:flex">
                        Upload
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCategoryImageChange}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Circular thumbnail shown in the category sidebar
                    </p>
                  </div>

                  <FormField
                    control={categoryForm.control}
                    name="name"
                    rules={{ required: "Category name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category name</FormLabel>
                        <FormControl>
                          <Input placeholder="Starters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={saveCategoryMutation.isPending}
                  >
                    {saveCategoryMutation.isPending ? "Saving..." : "Save Category"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={() => openItemDialog()}
            disabled={!categories.length}
          >
            <Plus className="mr-1 h-4 w-4" /> Item
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="hidden w-[260px] flex-shrink-0 md:block">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-3">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Categories
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Drag
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedCat(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors",
                  !selectedCat
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  All
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate">All Items</p>
                  <p className="text-xs opacity-75">{items.length} items</p>
                </div>
              </button>

              {categories.map((category) => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={() => setDraggedCategoryId(category.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleCategoryDrop(category.id)}
                  className="group"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                      selectedCat === category.id
                        ? "bg-primary/10"
                        : "hover:bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      className="cursor-grab text-muted-foreground active:cursor-grabbing"
                      aria-label={`Reorder ${category.name}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCat(category.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {category.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {category.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryItemCount(category.id)} items
                        </p>
                      </div>
                    </button>

                    <div className="hidden items-center gap-1 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => openCategoryDialog(category)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryPendingDelete(category)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:hidden fixed left-0 right-0 top-14 z-40 border-b border-border bg-background px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <Button
              variant={!selectedCat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCat(null)}
              className="flex-shrink-0"
            >
              All
            </Button>

            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCat === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCat(category.id)}
                className="flex-shrink-0 gap-2"
              >
                <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold">
                      {category.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-14 flex-1 md:mt-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by item name or description..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {!categories.length ? (
            <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
              <p className="text-base">Start by adding a category first.</p>
              <p className="mt-2 text-sm">
                Example: Starters, Main Course, Beverages
              </p>
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
              Loading menu...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onToggle={(targetItem) => toggleAvailabilityMutation.mutate(targetItem)}
                    onEdit={openItemDialog}
                    onDelete={(targetItem) => setItemPendingDelete(targetItem)}
                  />
                ))}
              </div>

              {!filteredItems.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">
                    {searchQuery
                      ? "No items match your search"
                      : "No items in this category yet"}
                  </p>
                </div>
              ) : null}
            </>
          )}

          {user ? (
            <div className="mt-6">
              <ComboManager
                userId={user.id}
                allItems={items}
                onDataChange={comboDataRefresh}
              />
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1 text-xs">
                Basic
              </TabsTrigger>
              {editingItem ? (
                <TabsTrigger value="tags" className="flex-1 text-xs">
                  Tags
                </TabsTrigger>
              ) : null}
              {editingItem ? (
                <TabsTrigger value="variants" className="flex-1 text-xs">
                  Variants
                </TabsTrigger>
              ) : null}
              {editingItem ? (
                <TabsTrigger value="addons" className="flex-1 text-xs">
                  Addons
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="basic" className="mt-4">
              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                <Form {...itemForm}>
                  <form
                    onSubmit={itemForm.handleSubmit((values) =>
                      saveItemMutation.mutate(values),
                    )}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={itemForm.control}
                        name="name"
                        rules={{ required: "Item name is required" }}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Paneer Tikka" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Short description shown on menu cards"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="price"
                        rules={{
                          required: "Selling price is required",
                          validate: (value) =>
                            Number(value) > 0 || "Enter a valid selling price",
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Selling Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(event) =>
                                  field.onChange(
                                    normalizeUnsignedDecimalInput(event.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="original_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Original Price / MRP</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Optional"
                                {...field}
                                onChange={(event) =>
                                  field.onChange(
                                    normalizeUnsignedDecimalInput(event.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="category_id"
                        rules={{ required: "Choose a category" }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="tax_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value: "inclusive" | "exclusive") =>
                                field.onChange(value)
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose tax type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="inclusive">Inclusive</SelectItem>
                                <SelectItem value="exclusive">Exclusive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="stock_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Leave blank for open stock"
                                {...field}
                                onChange={(event) =>
                                  field.onChange(
                                    normalizeUnsignedIntegerInput(event.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="low_stock_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Low Stock Threshold</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Optional"
                                {...field}
                                onChange={(event) =>
                                  field.onChange(
                                    normalizeUnsignedIntegerInput(event.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="available_from"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available From</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="available_to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available To</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-3">
                      <FormField
                        control={itemForm.control}
                        name="is_veg"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                            <div>
                              <FormLabel>Veg Item</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Green badge on card
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="is_featured"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                            <div>
                              <FormLabel>Featured</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Highlights the card with a star
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="is_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                            <div>
                              <FormLabel>Available</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Toggle item visibility
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Item image
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded images are compressed to WebP automatically
                          </p>
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-border p-4 transition-colors hover:border-primary">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                          {itemImagePreview ? (
                            <img
                              src={itemImagePreview}
                              alt="Item preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {itemImageFile ? itemImageFile.name : "Choose image"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Square or landscape images work best for cards
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleItemImageChange}
                        />
                      </label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={saveItemMutation.isPending}
                    >
                      {saveItemMutation.isPending ? "Saving..." : "Save Item"}
                    </Button>
                  </form>
                </Form>

                <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Live preview
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      This is how the item card will look in the manager grid.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      {itemImagePreview ? (
                        <img
                          src={itemImagePreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No image selected
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white",
                              itemValues.is_veg ? "bg-emerald-600" : "bg-rose-600",
                            )}
                          >
                            {itemValues.is_veg ? "Veg" : "Non-Veg"}
                          </span>
                          {itemValues.is_featured ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <h4 className="text-base font-semibold text-foreground">
                          {itemValues.name || "Item name"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {itemValues.description || "Item description preview"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            {currency.format(Number(itemValues.price || "0"))}
                          </span>
                          {itemValues.original_price ? (
                            <span className="text-sm text-muted-foreground line-through">
                              {currency.format(Number(itemValues.original_price))}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {itemValues.tax_type === "exclusive"
                            ? "Tax Exclusive"
                            : "Tax Inclusive"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            getStockPreviewClass(
                              itemValues.stock_quantity,
                              itemValues.low_stock_threshold,
                            ),
                          )}
                        >
                          {itemValues.stock_quantity
                            ? `Stock ${itemValues.stock_quantity}`
                            : "Open stock"}
                        </span>

                        {getTimePreview(
                          itemValues.available_from,
                          itemValues.available_to,
                        ) ? (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {getTimePreview(
                              itemValues.available_from,
                              itemValues.available_to,
                            )}
                          </span>
                        ) : null}

                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            itemValues.is_available
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {itemValues.is_available ? "Available" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {editingItem && user ? (
              <TabsContent value="tags" className="mt-4">
                <TagManager userId={user.id} menuItemId={editingItem.id} />
              </TabsContent>
            ) : null}

            {editingItem && user ? (
              <TabsContent value="variants" className="mt-4">
                <VariantManager userId={user.id} menuItemId={editingItem.id} />
              </TabsContent>
            ) : null}

            {editingItem && user ? (
              <TabsContent value="addons" className="mt-4">
                <AddonManager userId={user.id} menuItemId={editingItem.id} />
              </TabsContent>
            ) : null}
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(categoryPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setCategoryPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">
                {categoryPendingDelete?.name}
              </span>{" "}
              and any linked menu items if your database relationships are set to
              cascade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                categoryPendingDelete &&
                deleteCategoryMutation.mutate(categoryPendingDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(itemPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setItemPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {itemPendingDelete?.name}
              </span>{" "}
              from your menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                itemPendingDelete && deleteItemMutation.mutate(itemPendingDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {user ? (
        <CSVImportDialog
          open={csvOpen}
          onOpenChange={setCsvOpen}
          userId={user.id}
          categories={categories}
          onImportComplete={comboDataRefresh}
        />
      ) : null}
    </OwnerLayout>
  );
};

export default OwnerMenu;
