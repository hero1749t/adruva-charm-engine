import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, X, Search, Clock, Leaf, Moon, Sun, MapPin, Loader2, Ticket, Check, Package } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";
import CustomerReceipt from "@/components/CustomerReceipt";
import CustomerReview from "@/components/CustomerReview";
import ItemCustomizeModal, { type SelectedVariant, type SelectedAddon } from "@/components/menu/ItemCustomizeModal";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type ComboRow = Database["public"]["Tables"]["menu_combos"]["Row"];
type CartItem = MenuItem & {
  quantity: number;
  cartKey: string; // unique key for variant/addon combos
  selectedVariants: SelectedVariant[];
  selectedAddons: SelectedAddon[];
  extraPrice: number; // variant + addon extra per unit
  isCombo?: boolean;
  comboPrice?: number;
};
type PastOrder = { id: string; total: number; itemCount: number; time: string };

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
  const [upiId, setUpiId] = useState<string | null>(null);
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(null);
  const [restaurantGst, setRestaurantGst] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<{ name: string; quantity: number; price: number }[]>([]);
  const [orderCreatedAt, setOrderCreatedAt] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>("new");
  const [orderPlacedAt, setOrderPlacedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // GPS verification states
  const [restaurantGpsLat, setRestaurantGpsLat] = useState<number | null>(null);
  const [restaurantGpsLng, setRestaurantGpsLng] = useState<number | null>(null);
  const [restaurantGpsRange, setRestaurantGpsRange] = useState<number>(200);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [gpsChecking, setGpsChecking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [restaurantGstPct, setRestaurantGstPct] = useState<number>(5);
  const [livePaymentMethod, setLivePaymentMethod] = useState<string | null>(null);
  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ id: string; code: string; discount_type: string; discount_value: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    primary_color: string; secondary_color: string; background_color: string;
    text_color: string; accent_color: string; font_heading: string; font_body: string;
  } | null>(null);
  const [showBranding, setShowBranding] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("customer-dark-mode") === "true" || window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("customer-dark-mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (!ownerId) return;
    supabase.from("profiles").select("restaurant_name, upi_id, phone, restaurant_logo_url, address, gst_number, gps_latitude, gps_longitude, gps_range_meters, gst_percentage").eq("user_id", ownerId).single().then(({ data }: any) => {
      if (data?.restaurant_name) setRestaurantName(data.restaurant_name);
      if (data?.upi_id) setUpiId(data.upi_id);
      if (data?.phone) setOwnerPhone(data.phone);
      if (data?.restaurant_logo_url) setRestaurantLogo(data.restaurant_logo_url);
      if (data?.address) setRestaurantAddress(data.address);
      if (data?.gst_number) setRestaurantGst(data.gst_number);
      if (data?.gst_percentage != null) setRestaurantGstPct(data.gst_percentage);
      if (data?.gps_latitude != null) {
        setRestaurantGpsLat(data.gps_latitude);
        setRestaurantGpsLng(data.gps_longitude);
        setRestaurantGpsRange(data.gps_range_meters || 200);
      } else {
        // No GPS set by owner — skip verification
        setGpsVerified(true);
      }
    });
    Promise.all([
      supabase.from("menu_categories").select("*").eq("owner_id", ownerId).eq("is_active", true).order("sort_order"),
      supabase.from("menu_items").select("*").eq("owner_id", ownerId).eq("is_available", true).order("sort_order"),
      supabase.from("menu_customization").select("*").eq("owner_id", ownerId).maybeSingle(),
    ]).then(([catRes, itemRes, styleRes]) => {
      if (catRes.data) setCategories(catRes.data);
      if (itemRes.data) setItems(itemRes.data);
      if (styleRes.data) setMenuStyle(styleRes.data as any);
    });
    // Check owner's plan for white label
    supabase.from("owner_subscriptions").select("*, subscription_plans(feature_white_label)").eq("owner_id", ownerId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (data && (data as any).subscription_plans?.feature_white_label) {
        setShowBranding(false);
      }
    });
  }, [ownerId]);

  // Load custom Google Fonts for menu personalization
  useEffect(() => {
    if (!menuStyle) return;
    const fonts = new Set([menuStyle.font_heading, menuStyle.font_body].filter(f => f && f !== "Inter"));
    if (fonts.size === 0) return;
    const families = Array.from(fonts).map(f => f.replace(/ /g, "+") + ":wght@400;500;600;700").join("&family=");
    const linkId = "custom-menu-fonts";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
      document.head.appendChild(link);
    }
  }, [menuStyle]);

  // Build custom style object from owner's menu personalization
  const customStyle = useMemo(() => {
    if (!menuStyle) return {};
    return {
      "--cm-primary": menuStyle.primary_color,
      "--cm-secondary": menuStyle.secondary_color,
      "--cm-bg": menuStyle.background_color,
      "--cm-text": menuStyle.text_color,
      "--cm-accent": menuStyle.accent_color,
      "--cm-font-heading": menuStyle.font_heading,
      "--cm-font-body": menuStyle.font_body,
    } as React.CSSProperties;
  }, [menuStyle]);

  const cm = !!menuStyle; // whether custom menu style is active

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant notification chime (two-tone)
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.15); // G5
      oscillator.frequency.setValueAtTime(987.77, audioContext.currentTime + 0.3); // B5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log("Audio notification not supported");
    }
  };

  // Show browser notification
  const showBrowserNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🎉 Your order is ready!", {
        body: `Table ${tableNumber} - Pick up your order!`,
        icon: "/favicon.ico",
        tag: "order-ready",
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Estimated prep time based on item count (base 10min + 3min per item, max 45min)
  const estimatedMinutes = useMemo(() => {
    const itemCount = pastOrders.length > 0 ? pastOrders[0].itemCount : cart.reduce((s, c) => s + c.quantity, 0);
    return Math.min(45, 10 + itemCount * 3);
  }, [pastOrders, cart]);

  // Countdown timer
  useEffect(() => {
    if (!orderPlacedAt || liveStatus === "ready" || liveStatus === "served" || liveStatus === "cancelled") {
      setTimeLeft(null);
      return;
    }
    const estimatedMs = estimatedMinutes * 60 * 1000;
    const tick = () => {
      const elapsed = Date.now() - orderPlacedAt;
      const remaining = Math.max(0, estimatedMs - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [orderPlacedAt, estimatedMinutes, liveStatus]);

  // Real-time order tracking
  useEffect(() => {
    if (!orderPlaced) return;
    supabase.from("orders").select("status, payment_method").eq("id", orderPlaced).single().then(({ data }) => {
      if (data) {
        setLiveStatus(data.status);
        setLivePaymentMethod(data.payment_method);
      }
    });
    const channel = supabase
      .channel(`order-track-${orderPlaced}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderPlaced}` }, (payload) => {
        const newStatus = (payload.new as any).status;
        const newPayment = (payload.new as any).payment_method;
        setLiveStatus(newStatus);
        setLivePaymentMethod(newPayment);
        
        // Trigger alerts when order is ready
        if (newStatus === "ready") {
          playNotificationSound();
          showBrowserNotification();
          toast.success("🎉 Your order is ready!", { duration: 5000 });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderPlaced, tableNumber]);

  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null);
  const [combos, setCombos] = useState<(ComboRow & { items: { name: string; quantity: number }[] })[]>([]);

  // Fetch combos
  useEffect(() => {
    if (!ownerId) return;
    supabase.from("menu_combos").select("*").eq("owner_id", ownerId).eq("is_available", true).order("sort_order").then(async ({ data }) => {
      if (!data || data.length === 0) return;
      const { data: comboItems } = await supabase
        .from("combo_items")
        .select("combo_id, quantity, menu_item_id, menu_items(name)")
        .in("combo_id", data.map(c => c.id)) as any;
      setCombos(data.map(c => ({
        ...c,
        items: (comboItems || []).filter((ci: any) => ci.combo_id === c.id).map((ci: any) => ({
          name: ci.menu_items?.name || "Item",
          quantity: ci.quantity,
        })),
      })));
    });
  }, [ownerId]);

  const addToCart = (item: MenuItem) => {
    // Open customize modal - it will auto-add if no variants/addons
    setCustomizeItem(item);
  };

  const handleCustomizeAdd = (item: MenuItem, variants: SelectedVariant[], addons: SelectedAddon[], extraPrice: number) => {
    const cartKey = item.id + "|" + variants.map(v => v.optionName).join(",") + "|" + addons.map(a => a.optionName).join(",");
    setCart((prev) => {
      const existing = prev.find((c) => c.cartKey === cartKey);
      if (existing) return prev.map((c) => c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1, cartKey, selectedVariants: variants, selectedAddons: addons, extraPrice }];
    });
    setCustomizeItem(null);
    toast.success(`${item.name} added`, { duration: 1500 });
  };

  const addComboToCart = (combo: ComboRow) => {
    const cartKey = "combo-" + combo.id;
    setCart((prev) => {
      const existing = prev.find((c) => c.cartKey === cartKey);
      if (existing) return prev.map((c) => c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        id: combo.id,
        name: combo.name,
        price: combo.combo_price,
        image_url: combo.image_url,
        description: combo.description,
        is_veg: true,
        is_available: true,
        category_id: "",
        owner_id: combo.owner_id,
        sort_order: 0,
        created_at: "",
        updated_at: "",
        quantity: 1,
        cartKey,
        selectedVariants: [],
        selectedAddons: [],
        extraPrice: 0,
        isCombo: true,
        comboPrice: Number(combo.combo_price),
      } as CartItem];
    });
    toast.success(`${combo.name} added`, { duration: 1500 });
  };

  const updateQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.cartKey === cartKey ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, c) => (Number(c.price) + c.extraPrice) * c.quantity + sum, 0);
  const discountAmount = promoApplied
    ? promoApplied.discount_type === "percentage"
      ? Math.round(subtotal * promoApplied.discount_value / 100)
      : Math.min(promoApplied.discount_value, subtotal)
    : 0;
  const total = subtotal - discountAmount;
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    if (!phone.trim()) { setPromoError("Enter your phone number first to apply coupon"); return; }
    setPromoChecking(true);
    setPromoError(null);
    // Check coupon exists and is active
    const { data: coupon } = await supabase
      .from("discount_coupons")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("code", promoCode.toUpperCase().trim())
      .eq("is_active", true)
      .single() as any;
    if (!coupon) { setPromoError("Invalid or expired coupon code"); setPromoChecking(false); return; }
    const now = new Date();
    if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_until)) {
      setPromoError("This coupon has expired"); setPromoChecking(false); return;
    }
    if (subtotal < coupon.min_order_amount) {
      setPromoError(`Minimum order ₹${coupon.min_order_amount} required`); setPromoChecking(false); return;
    }
    // Check usage count
    const { count } = await supabase
      .from("coupon_usage")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_phone", phone.trim()) as any;
    if ((count || 0) >= coupon.max_uses_per_person) {
      setPromoError("You've already used this coupon maximum times"); setPromoChecking(false); return;
    }
    setPromoApplied({ id: coupon.id, code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value });
    toast.success(`Coupon applied! ${coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`}`);
    setPromoChecking(false);
  };

  const removePromo = () => {
    setPromoApplied(null);
    setPromoCode("");
    setPromoError(null);
  };

  // Haversine distance calculation
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const verifyGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported on this device");
      return;
    }
    setGpsChecking(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (restaurantGpsLat != null && restaurantGpsLng != null) {
          const distance = getDistanceMeters(latitude, longitude, restaurantGpsLat, restaurantGpsLng);
          const allowedRadius = restaurantGpsRange / 2; // diameter → radius
          if (distance <= allowedRadius) {
            setGpsVerified(true);
            setGpsError(null);
            toast.success("Location verified! You can now place orders.");
          } else {
            setGpsError(`You are ${Math.round(distance)}m away. Please be within ${restaurantGpsRange}m diameter zone of the restaurant.`);
          }
        }
        setGpsChecking(false);
      },
      (err) => {
        setGpsError(err.code === 1 ? "Location access denied. Please enable GPS." : "Could not detect your location. Try again.");
        setGpsChecking(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (error || !order) {
      toast.error("Order failed! Please try again.");
      setOrdering(false);
      return;
    }

    const orderItems = cart.map((c) => {
      const extras = [
        ...c.selectedVariants.map(v => v.optionName),
        ...c.selectedAddons.map(a => a.optionName),
      ];
      const itemName = extras.length > 0 ? `${c.name} (${extras.join(", ")})` : c.name;
      return {
        order_id: order.id,
        menu_item_id: c.isCombo ? c.id : c.id, // combo items still reference the combo id
        item_name: itemName,
        item_price: Number(c.price) + c.extraPrice,
        quantity: c.quantity,
      };
    });
    await supabase.from("order_items").insert(orderItems);

    // Record coupon usage if applied
    if (promoApplied && phone.trim()) {
      await supabase.from("coupon_usage").insert({
        coupon_id: promoApplied.id,
        owner_id: ownerId,
        customer_phone: phone.trim(),
        order_id: order.id,
      } as any);
    }

    // Save to session history
    setPastOrders((prev) => [
      { id: order.id, total, itemCount: cartCount, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
      ...prev,
    ]);

    setOrderPlaced(order.id);
    setOrderPlacedAt(Date.now());
    setOrderTotal(total);
    setOrderItems(cart.map(c => {
      const extras = [...c.selectedVariants.map(v => v.optionName), ...c.selectedAddons.map(a => a.optionName)];
      return { name: extras.length > 0 ? `${c.name} (${extras.join(", ")})` : c.name, quantity: c.quantity, price: Number(c.price) + c.extraPrice };
    }));
    setOrderCreatedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
    setCart([]);
    setCartOpen(false);
    setOrdering(false);
    setNotes("");
    setPromoApplied(null);
    setPromoCode("");
  };

  // Filtered items with search + veg filter
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCat) result = result.filter((i) => i.category_id === selectedCat);
    if (vegOnly) result = result.filter((i) => i.is_veg);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    return result;
  }, [items, selectedCat, vegOnly, searchQuery]);

  const statusSteps = [
    { key: "new", label: "Order Placed", emoji: "📝" },
    { key: "accepted", label: "Accepted", emoji: "👍" },
    { key: "preparing", label: "Preparing", emoji: "🍳" },
    { key: "ready", label: "Ready!", emoji: "✅" },
    { key: "served", label: "Served", emoji: "🍽️" },
  ];
  const currentStepIndex = statusSteps.findIndex((s) => s.key === liveStatus);

  // ── ORDER TRACKING SCREEN ──
  if (orderPlaced) {
    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurantName || "Restaurant")}&am=${orderTotal.toFixed(2)}&cu=INR&tn=Order-${orderPlaced.slice(0, 8)}`
      : null;

    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-sm mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{statusSteps[currentStepIndex]?.emoji || "📝"}</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {liveStatus === "ready" ? "Your order is ready!" : liveStatus === "served" ? "Enjoy your meal!" : "Order Placed!"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Table {tableNumber} • Order #{orderPlaced.slice(0, 8)}</p>
            
            {/* Estimated time display */}
            {timeLeft !== null && timeLeft > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 inline-flex items-center gap-2 bg-accent/50 border border-border rounded-full px-4 py-2"
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  ~{Math.ceil(timeLeft / 60)} min remaining
                </span>
              </motion.div>
            )}
            {timeLeft === 0 && liveStatus !== "ready" && liveStatus !== "served" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 inline-flex items-center gap-2 bg-accent/50 border border-border rounded-full px-4 py-2"
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Almost ready...</span>
              </motion.div>
            )}
            {(liveStatus === "ready" || liveStatus === "served") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2"
              >
                <span className="text-sm font-semibold text-primary">
                  {liveStatus === "ready" ? "🎉 Pick up now!" : "✨ Bon appétit!"}
                </span>
              </motion.div>
            )}
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 bg-card border border-border rounded-2xl p-5 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Live Status</p>
            <div className="space-y-0">
              {statusSteps.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isLast = i === statusSteps.length - 1;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                          isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg"
                          : isActive ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.emoji}
                      </motion.div>
                      {!isLast && <div className={`w-0.5 h-5 transition-colors ${isActive && i < currentStepIndex ? "bg-primary" : "bg-border"}`} />}
                    </div>
                    <div className={`pt-1.5 ${isCurrent ? "text-foreground font-semibold" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      <p className="text-sm">{step.label}</p>
                      {isCurrent && liveStatus !== "served" && (
                        <p className="text-xs text-primary mt-0.5 animate-pulse">In progress...</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {upiLink && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-card text-center">
              <p className="font-semibold text-foreground mb-1">Pay ₹{orderTotal.toFixed(0)} via UPI</p>
              <p className="text-xs text-muted-foreground mb-3">Scan with any UPI app</p>
              <div className="bg-background rounded-lg p-3 inline-block"><QRCodeSVG value={upiLink} size={150} /></div>
              <p className="text-xs text-muted-foreground mt-2">UPI: {upiId}</p>
            </motion.div>
          )}

          {!upiLink && (
            <div className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-card text-center">
              <p className="font-semibold text-foreground">Pay ₹{orderTotal.toFixed(0)} at the counter</p>
            </div>
          )}

          {ownerPhone && (
            <a
              href={`https://wa.me/${ownerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                `🍽️ New Order!\nOrder ID: ${orderPlaced.slice(0, 8)}\nTable: ${tableNumber}\nTotal: ₹${orderTotal.toFixed(0)}\n\nPlease prepare my order. Thank you!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-green-500 hover:bg-green-600 text-primary-foreground font-semibold py-3 px-4 transition-colors"
            >
              📱 Notify on WhatsApp
            </a>
          )}

          {/* Receipt — only after payment confirmed */}
          {livePaymentMethod && livePaymentMethod !== "counter" ? (
            <CustomerReceipt
              orderId={orderPlaced}
              restaurantName={restaurantName}
              tableNumber={tableNumber}
              items={orderItems}
              total={orderTotal}
              gstNumber={restaurantGst}
              address={restaurantAddress}
              phone={ownerPhone}
              createdAt={orderCreatedAt}
              gstPercentage={restaurantGstPct}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 bg-muted/50 border border-border rounded-2xl p-4 text-center"
            >
              <p className="text-sm text-muted-foreground">🧾 Receipt available after payment confirmation</p>
            </motion.div>
          )}
          {(liveStatus === "served" || liveStatus === "ready") && ownerId && (
            <CustomerReview
              orderId={orderPlaced}
              ownerId={ownerId}
              onSubmitted={() => {}}
            />
          )}

          <Button variant="hero" className="mt-4 w-full" onClick={() => { setOrderPlaced(null); setOrderTotal(0); setLiveStatus("new"); setOrderPlacedAt(null); setTimeLeft(null); setOrderItems([]); setOrderCreatedAt(""); }}>
            Order More
          </Button>
        </div>
      </div>
    );
  }

  // ── MENU SCREEN ──
  return (
    <div className="min-h-screen pb-24" style={cm ? { ...customStyle, backgroundColor: menuStyle!.background_color, color: menuStyle!.text_color, fontFamily: menuStyle!.font_body } : {}} >
      {!cm && <div className="absolute inset-0 -z-10 bg-background" />}
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 shadow-lg" style={cm ? { backgroundColor: menuStyle!.secondary_color, color: "#fff" } : undefined}>
        {!cm && <div className="absolute inset-0 bg-secondary" />}
        <div className="max-w-lg mx-auto flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            {restaurantLogo && (
              <img src={restaurantLogo} alt="Logo" className="w-9 h-9 rounded-lg object-cover border border-white/20" />
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={cm ? { fontFamily: menuStyle!.font_heading } : undefined}>{restaurantName || "Menu"}</h1>
              {tableNumber > 0 && <p className="text-xs opacity-60">Table {tableNumber}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pastOrders.length > 0 && (
              <button onClick={() => setShowHistory(true)} className="relative opacity-70 hover:opacity-100">
                <Clock className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold" style={cm ? { backgroundColor: menuStyle!.primary_color } : undefined}>
                  {!cm && <span className="absolute inset-0 bg-primary rounded-full" />}
                  <span className="relative">{pastOrders.length}</span>
                </span>
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg transition-colors"
              style={cm ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {ownerPhone && (
              <a href={`tel:${ownerPhone}`} className="text-xs opacity-70 hover:opacity-100 transition-opacity">
                📞 {ownerPhone}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={cm ? { color: menuStyle!.text_color + "80" } : undefined} />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cm ? "w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none" : "w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"}
            style={cm ? { backgroundColor: menuStyle!.accent_color + "15", border: `1px solid ${menuStyle!.accent_color}30`, color: menuStyle!.text_color, fontFamily: menuStyle!.font_body } : undefined}
          />
        </div>

        {/* Veg filter + Category pills */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              vegOnly ? "bg-green-50 border-green-500 text-green-700" : cm ? "" : "bg-card border-border text-muted-foreground"
            }`}
            style={!vegOnly && cm ? { backgroundColor: menuStyle!.accent_color + "15", borderColor: menuStyle!.accent_color + "40", color: menuStyle!.text_color + "99" } : undefined}
          >
            <Leaf className="w-3.5 h-3.5" />
            Veg
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1 -mr-4 pr-4">
            <button
              onClick={() => setSelectedCat(null)}
              className={cm ? "px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors" : `px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${!selectedCat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"}`}
              style={cm ? (!selectedCat ? { backgroundColor: menuStyle!.primary_color, color: "#fff" } : { backgroundColor: menuStyle!.accent_color + "15", color: menuStyle!.text_color + "99" }) : undefined}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={cm ? "px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors" : `px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedCat === cat.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"}`}
                style={cm ? (selectedCat === cat.id ? { backgroundColor: menuStyle!.primary_color, color: "#fff" } : { backgroundColor: menuStyle!.accent_color + "15", color: menuStyle!.text_color + "99" }) : undefined}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <p className="text-muted-foreground">No dishes found</p>
              {(searchQuery || vegOnly) && (
                <button onClick={() => { setSearchQuery(""); setVegOnly(false); }} className="text-primary text-sm mt-2 underline">
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const itemCartEntries = cart.filter((c) => c.id === item.id && !c.isCombo);
              const totalInCart = itemCartEntries.reduce((s, c) => s + c.quantity, 0);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cm ? "flex gap-3 rounded-2xl p-3 transition-shadow" : "flex gap-3 bg-card rounded-2xl border border-border p-3 shadow-card hover:shadow-md transition-shadow"}
                  style={cm ? { backgroundColor: menuStyle!.accent_color + "10", border: `1px solid ${menuStyle!.accent_color}25` } : undefined}
                >
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 ${
                          item.is_veg ? "border-green-600" : "border-red-500"
                        }`}>
                          <span className={`block w-1.5 h-1.5 rounded-full m-auto mt-[1px] ${
                            item.is_veg ? "bg-green-600" : "bg-red-500"
                          }`} />
                        </span>
                        <span className="font-semibold text-sm truncate" style={cm ? { color: menuStyle!.text_color, fontFamily: menuStyle!.font_heading } : undefined}>{item.name}</span>
                      </div>
                      {item.description && <p className="text-xs mt-0.5 line-clamp-2" style={cm ? { color: menuStyle!.text_color + "99" } : undefined}>{item.description}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-base" style={cm ? { color: menuStyle!.text_color, fontFamily: menuStyle!.font_heading } : undefined}>₹{item.price}</span>
                      <div className="flex items-center gap-2">
                        {totalInCart > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={cm ? { backgroundColor: menuStyle!.primary_color + "20", color: menuStyle!.primary_color } : undefined}>
                            {!cm && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{totalInCart} in cart</span>}
                            {cm && `${totalInCart} in cart`}
                          </span>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-xl border-2 text-xs font-bold transition-colors"
                          style={cm ? { borderColor: menuStyle!.primary_color, color: menuStyle!.primary_color } : undefined}
                        >
                          <Plus className="w-3.5 h-3.5" /> ADD
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Combos section */}
          {combos.length > 0 && !searchQuery && (
            <div className="mt-6 mb-4">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2" style={cm ? { fontFamily: menuStyle!.font_heading, color: menuStyle!.text_color } : undefined}>
                <Package className="w-5 h-5" style={cm ? { color: menuStyle!.primary_color } : undefined} />
                {!cm && <Package className="w-5 h-5 text-primary absolute" />}
                Combo Deals
              </h2>
              <div className="space-y-3">
                {combos.map((combo) => {
                  const comboInCart = cart.find(c => c.cartKey === "combo-" + combo.id);
                  return (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cm ? "rounded-2xl p-4 transition-shadow" : "bg-card rounded-2xl border border-border p-4 shadow-card"}
                      style={cm ? { backgroundColor: menuStyle!.accent_color + "10", border: `1px solid ${menuStyle!.accent_color}25` } : undefined}
                    >
                      <div className="flex gap-3">
                        {combo.image_url && (
                          <img src={combo.image_url} alt={combo.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-sm" style={cm ? { fontFamily: menuStyle!.font_heading, color: menuStyle!.text_color } : undefined}>{combo.name}</h3>
                          {combo.description && <p className="text-xs mt-0.5 opacity-60">{combo.description}</p>}
                          <p className="text-xs mt-1 opacity-70">
                            {combo.items.map(i => `${i.quantity}x ${i.name}`).join(" + ")}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-base" style={cm ? { color: menuStyle!.primary_color, fontFamily: menuStyle!.font_heading } : undefined}>₹{combo.combo_price}</span>
                            {comboInCart ? (
                              <div className="flex items-center gap-1 rounded-xl overflow-hidden" style={cm ? { backgroundColor: menuStyle!.primary_color } : undefined}>
                                {!cm && <div className="absolute inset-0 bg-primary rounded-xl" />}
                                <button onClick={() => updateQty("combo-" + combo.id, -1)} className="relative px-2 py-1.5 text-white hover:opacity-80"><Minus className="w-4 h-4" /></button>
                                <span className="relative text-sm font-bold text-white w-6 text-center">{comboInCart.quantity}</span>
                                <button onClick={() => updateQty("combo-" + combo.id, 1)} className="relative px-2 py-1.5 text-white hover:opacity-80"><Plus className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => addComboToCart(combo)}
                                className="flex items-center gap-1 px-4 py-1.5 rounded-xl border-2 text-xs font-bold transition-colors"
                                style={cm ? { borderColor: menuStyle!.primary_color, color: menuStyle!.primary_color } : undefined}
                              >
                                <Plus className="w-3.5 h-3.5" /> ADD
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Cart bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={cm ? "fixed bottom-0 left-0 right-0 p-4 z-50 shadow-2xl" : "fixed bottom-0 left-0 right-0 bg-primary p-4 z-50 shadow-2xl"}
            style={cm ? { backgroundColor: menuStyle!.primary_color } : undefined}
          >
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="text-white">
                <span className="font-bold">{cartCount} item{cartCount > 1 ? "s" : ""}</span>
                <span className="mx-2 opacity-50">|</span>
                <span className="font-bold text-lg" style={cm ? { fontFamily: menuStyle!.font_heading } : undefined}>₹{total.toFixed(0)}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                style={cm ? { backgroundColor: "#fff", color: menuStyle!.primary_color } : undefined}
              >
                View Cart <ShoppingCart className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-bold text-foreground">Your Cart</h2>
                <button onClick={() => setCartOpen(false)} className="text-muted-foreground p-1 hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                {cart.map((item) => {
                  const unitPrice = Number(item.price) + item.extraPrice;
                  const extras = [...item.selectedVariants.map(v => v.optionName), ...item.selectedAddons.map(a => a.optionName)];
                  return (
                    <div key={item.cartKey} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item.is_veg ? "bg-green-600" : "bg-red-500"}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{item.isCombo ? "🎁 " : ""}{item.name}</p>
                          {extras.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate">{extras.join(", ")}</p>
                          )}
                          <p className="text-xs text-muted-foreground">₹{unitPrice} × {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-foreground text-sm">₹{(unitPrice * item.quantity).toFixed(0)}</span>
                        <div className="flex items-center gap-0.5 bg-muted rounded-lg overflow-hidden">
                          <button onClick={() => updateQty(item.cartKey, -1)} className="p-1.5 hover:bg-muted-foreground/10"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.cartKey, 1)} className="p-1.5 hover:bg-muted-foreground/10"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order notes */}
              <textarea
                placeholder="Special instructions (e.g. extra spicy, no onion)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300}
                rows={2}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm mb-3 bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {/* Phone number — moved before promo */}
              <input
                type="tel"
                placeholder="Phone number (for updates & promo codes)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm mb-3 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {/* Promo code */}
              <div className="mb-3">
                {promoApplied ? (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">{promoApplied.code}</span>
                      <span className="text-xs text-muted-foreground">
                        ({promoApplied.discount_type === "percentage" ? `${promoApplied.discount_value}% off` : `₹${promoApplied.discount_value} off`})
                      </span>
                    </div>
                    <button onClick={removePromo} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Promo code"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                        className="w-full border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono uppercase"
                      />
                    </div>
                    <button
                      onClick={applyPromo}
                      disabled={promoChecking || !promoCode.trim()}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                    >
                      {promoChecking ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {promoError && <p className="text-xs text-destructive mt-1.5">{promoError}</p>}
              </div>

              {/* Total breakdown */}
              <div className="border-t border-border pt-4 mb-4 space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-primary font-medium">
                    <span>Discount ({promoApplied?.code})</span>
                    <span>-₹{discountAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-bold text-lg text-foreground pt-1">
                  <span>Total</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>
              </div>


              {!gpsVerified ? (
                <div className="space-y-3">
                  <div className="bg-accent/50 border border-border rounded-xl p-4 text-center">
                    <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Location Verification Required</p>
                    <p className="text-xs text-muted-foreground mt-1">Enable GPS to confirm you're at the restaurant</p>
                  </div>
                  {gpsError && (
                    <p className="text-xs text-destructive text-center">{gpsError}</p>
                  )}
                  <Button variant="hero" className="w-full h-14 text-base rounded-xl gap-2" onClick={verifyGPS} disabled={gpsChecking}>
                    {gpsChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    {gpsChecking ? "Verifying Location..." : "Verify My Location"}
                  </Button>
                </div>
              ) : (
                <Button variant="hero" className="w-full h-14 text-base rounded-xl" onClick={placeOrder} disabled={ordering}>
                  {ordering ? "Placing Order..." : `Place Order — ₹${total.toFixed(0)}`}
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order history drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[60vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-lg font-bold text-foreground">Your Orders</h2>
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {pastOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Order #{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{o.itemCount} item{o.itemCount > 1 ? "s" : ""} • {o.time}</p>
                    </div>
                    <span className="font-display font-bold text-foreground">₹{o.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item customize modal */}
      <AnimatePresence>
        {customizeItem && ownerId && (
          <ItemCustomizeModal
            item={customizeItem}
            ownerId={ownerId}
            onClose={() => setCustomizeItem(null)}
            onAdd={(variants, addons, extraPrice) => handleCustomizeAdd(customizeItem, variants, addons, extraPrice)}
            menuStyle={menuStyle}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerMenu;
