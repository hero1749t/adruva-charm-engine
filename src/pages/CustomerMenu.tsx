import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, X, Search, Clock, Leaf, Moon, Sun, MapPin, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";
import CustomerReceipt from "@/components/CustomerReceipt";
import CustomerReview from "@/components/CustomerReview";

type Category = Database["public"]["Tables"]["menu_categories"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type CartItem = MenuItem & { quantity: number };
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
    ]).then(([catRes, itemRes]) => {
      if (catRes.data) setCategories(catRes.data);
      if (itemRes.data) setItems(itemRes.data);
    });
  }, [ownerId]);

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

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added`, { duration: 1500 });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0)
    );
  };

  const total = cart.reduce((sum, c) => sum + Number(c.price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

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

    const orderItems = cart.map((c) => ({
      order_id: order.id,
      menu_item_id: c.id,
      item_name: c.name,
      item_price: Number(c.price),
      quantity: c.quantity,
    }));
    await supabase.from("order_items").insert(orderItems);

    // Save to session history
    setPastOrders((prev) => [
      { id: order.id, total, itemCount: cartCount, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
      ...prev,
    ]);

    setOrderPlaced(order.id);
    setOrderPlacedAt(Date.now());
    setOrderTotal(total);
    setOrderItems(cart.map(c => ({ name: c.name, quantity: c.quantity, price: Number(c.price) })));
    setOrderCreatedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
    setCart([]);
    setCartOpen(false);
    setOrdering(false);
    setNotes("");
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

          {/* Receipt */}
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
          />

          {/* Review - show after served */}
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-secondary px-4 py-3 text-secondary-foreground shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurantLogo && (
              <img src={restaurantLogo} alt="Logo" className="w-9 h-9 rounded-lg object-cover border border-secondary-foreground/20" />
            )}
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">{restaurantName || "Menu"}</h1>
              {tableNumber > 0 && <p className="text-xs text-secondary-foreground/60">Table {tableNumber}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pastOrders.length > 0 && (
              <button onClick={() => setShowHistory(true)} className="relative text-secondary-foreground/70 hover:text-secondary-foreground">
                <Clock className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                  {pastOrders.length}
                </span>
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="font-display text-sm font-bold">
              <span className="text-primary">ADRU</span>vaa
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Veg filter + Category pills */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              vegOnly ? "bg-green-50 border-green-500 text-green-700" : "bg-card border-border text-muted-foreground"
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            Veg
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1 -mr-4 pr-4">
            <button
              onClick={() => setSelectedCat(null)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                !selectedCat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCat === cat.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                }`}
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
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-3 bg-card rounded-2xl border border-border p-3 shadow-card hover:shadow-md transition-shadow"
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
                        <span className="font-semibold text-foreground text-sm truncate">{item.name}</span>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-display font-bold text-foreground text-base">₹{item.price}</span>
                      {inCart ? (
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 bg-primary rounded-xl overflow-hidden"
                        >
                          <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1.5 text-primary-foreground hover:bg-primary/80 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold text-primary-foreground w-6 text-center">{inCart.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1.5 text-primary-foreground hover:bg-primary/80 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-xl border-2 border-primary text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> ADD
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>

      {/* Cart bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-primary p-4 z-50 shadow-2xl"
          >
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="text-primary-foreground">
                <span className="font-bold">{cartCount} item{cartCount > 1 ? "s" : ""}</span>
                <span className="mx-2 opacity-50">|</span>
                <span className="font-display font-bold text-lg">₹{total.toFixed(0)}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2 rounded-xl font-bold text-sm"
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
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-sm ${item.is_veg ? "bg-green-600" : "bg-red-500"}`} />
                      <div>
                        <p className="font-medium text-foreground text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">₹{(Number(item.price) * item.quantity).toFixed(0)}</span>
                      <div className="flex items-center gap-0.5 bg-muted rounded-lg overflow-hidden">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1.5 hover:bg-muted-foreground/10"><Minus className="w-3 h-3" /></button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1.5 hover:bg-muted-foreground/10"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
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

              <div className="border-t border-border pt-4 mb-4">
                <div className="flex justify-between font-display font-bold text-lg text-foreground">
                  <span>Total</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>
              </div>

              <input
                type="tel"
                placeholder="Phone number (optional — for updates)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm mb-4 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

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
    </div>
  );
};

export default CustomerMenu;
