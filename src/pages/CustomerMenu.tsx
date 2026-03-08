import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

type CartItem = MenuItem & { quantity: number };

const CustomerMenu = () => {
  const { ownerId } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = parseInt(searchParams.get("table") || "0");

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!ownerId) return;

    // Fetch restaurant name
    supabase.from("profiles").select("restaurant_name").eq("user_id", ownerId).single().then(({ data }) => {
      if (data?.restaurant_name) setRestaurantName(data.restaurant_name);
    });

    // Fetch menu
    Promise.all([
      supabase.from("menu_categories").select("*").eq("owner_id", ownerId).eq("is_active", true).order("sort_order"),
      supabase.from("menu_items").select("*").eq("owner_id", ownerId).eq("is_available", true).order("sort_order"),
    ]).then(([catRes, itemRes]) => {
      if (catRes.data) setCategories(catRes.data);
      if (itemRes.data) setItems(itemRes.data);
    });
  }, [ownerId]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added`);
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0)
    );
  };

  const total = cart.reduce((sum, c) => sum + Number(c.price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    if (!ownerId || cart.length === 0) return;
    setOrdering(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        owner_id: ownerId,
        table_number: tableNumber,
        customer_phone: phone || null,
        total_amount: total,
        status: "new",
      })
      .select()
      .single();

    if (error || !order) {
      toast.error("Order failed! Please try again.");
      setOrdering(false);
      return;
    }

    const orderItems = cart.map((c) => ({
      order_id: order.id,
      menu_item_id: c.id,
      item_name: c.name,
      item_price: Number(c.price),
      quantity: c.quantity,
    }));

    await supabase.from("order_items").insert(orderItems);

    setOrderPlaced(order.id);
    setCart([]);
    setCartOpen(false);
    setOrdering(false);
  };

  const filteredItems = selectedCat ? items.filter((i) => i.category_id === selectedCat) : items;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Order Placed!</h1>
          <p className="text-muted-foreground mt-2">Your order has been sent to the kitchen. Please wait at Table {tableNumber}.</p>
          <p className="text-sm text-muted-foreground mt-4">Order ID: {orderPlaced.slice(0, 8)}</p>
          <Button variant="hero" className="mt-6" onClick={() => { setOrderPlaced(null); }}>
            Order More
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-secondary px-4 py-3 text-secondary-foreground">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold">{restaurantName || "Menu"}</h1>
            {tableNumber > 0 && <p className="text-xs text-secondary-foreground/60">Table {tableNumber}</p>}
          </div>
          <span className="font-display text-sm font-bold">
            <span className="text-primary">ADRU</span>vaa
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCat === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items */}
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const inCart = cart.find((c) => c.id === item.id);
            return (
              <div key={item.id} className="flex gap-3 bg-card rounded-xl border border-border p-3 shadow-card">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm border ${item.is_veg ? "border-green-600 bg-green-600" : "border-red-600 bg-red-600"}`} />
                    <span className="font-semibold text-foreground text-sm truncate">{item.name}</span>
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-display font-bold text-foreground">₹{item.price}</span>
                    {inCart ? (
                      <div className="flex items-center gap-2 bg-primary rounded-lg px-1">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 text-primary-foreground"><Minus className="w-4 h-4" /></button>
                        <span className="text-sm font-bold text-primary-foreground w-5 text-center">{inCart.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 text-primary-foreground"><Plus className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => addToCart(item)} className="h-8 text-xs border-primary text-primary">
                        <Plus className="w-3 h-3 mr-1" /> ADD
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary p-4 z-50">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="text-primary-foreground">
              <span className="font-bold">{cartCount} item{cartCount > 1 ? "s" : ""}</span>
              <span className="mx-2">|</span>
              <span className="font-display font-bold">₹{total.toFixed(0)}</span>
            </div>
            <Button
              variant="hero-outline"
              size="sm"
              onClick={() => setCartOpen(true)}
            >
              View Cart <ShoppingCart className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/50" onClick={() => setCartOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">₹{(Number(item.price) * item.quantity).toFixed(0)}</span>
                    <div className="flex items-center gap-1 bg-muted rounded-lg px-1">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 mb-4">
              <div className="flex justify-between font-display font-bold text-lg text-foreground">
                <span>Total</span>
                <span>₹{total.toFixed(0)}</span>
              </div>
            </div>

            <input
              type="tel"
              placeholder="Phone number (optional — for WhatsApp update)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3 text-sm mb-4 bg-background"
            />

            <Button variant="hero" className="w-full h-14 text-base" onClick={placeOrder} disabled={ordering}>
              {ordering ? "Placing Order..." : `Place Order — ₹${total.toFixed(0)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
