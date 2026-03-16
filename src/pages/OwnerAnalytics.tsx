import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { IndianRupee, ShoppingBag, TrendingUp, Utensils, Download, Star, MessageSquare, MessageCircle, Send, Reply } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderWithItems = Order & { order_items: OrderItem[] };
type Review = Database["public"]["Tables"]["customer_reviews"]["Row"];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 220 70% 50%))",
  "hsl(var(--chart-3, 150 60% 40%))",
  "hsl(var(--chart-4, 30 80% 55%))",
  "hsl(var(--chart-5, 280 65% 60%))",
  "hsl(var(--muted-foreground))",
];

type Period = "today" | "7days" | "30days";

type ReviewWithReply = Review;

const ReviewCard = ({ review, onReplied }: { review: ReviewWithReply; onReplied: (id: string, text: string) => void }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState(review.owner_reply || "");
  const [sending, setSending] = useState(false);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("customer_reviews")
      .update({ owner_reply: replyText.trim(), replied_at: new Date().toISOString() })
      .eq("id", review.id);
    setSending(false);
    if (error) {
      toast("Failed to send reply");
      return;
    }
    toast.success("Reply sent!");
    setShowReplyInput(false);
    onReplied(review.id, replyText.trim());
  };

  const hasReply = !!review.owner_reply;

  return (
    <div className="border-b border-border pb-3 last:border-0">
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {new Date(review.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </span>
      </div>
      {review.customer_name && <p className="text-xs font-semibold text-foreground">{review.customer_name}</p>}
      <p className="text-xs text-muted-foreground">{review.comment}</p>

      {hasReply && !showReplyInput && (
        <div className="mt-2 ml-3 pl-2 border-l-2 border-primary/30">
          <p className="text-xs text-foreground font-medium">Your reply:</p>
          <p className="text-xs text-muted-foreground">{review.owner_reply}</p>
          <button onClick={() => setShowReplyInput(true)} className="text-xs text-primary mt-1 hover:underline">Edit</button>
        </div>
      )}

      {!hasReply && !showReplyInput && (
        <button
          onClick={() => setShowReplyInput(true)}
          className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Reply className="w-3 h-3" /> Reply
        </button>
      )}

      {showReplyInput && (
        <div className="mt-2 flex gap-1.5">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 text-xs bg-muted border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
          />
          <button
            onClick={submitReply}
            disabled={sending || !replyText.trim()}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

const OwnerAnalytics = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [period, setPeriod] = useState<Period>("7days");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    let from: Date;
    if (period === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "7days") {
      from = new Date(now.getTime() - 7 * 86400000);
    } else {
      from = new Date(now.getTime() - 30 * 86400000);
    }

    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("owner_id", user.id)
      .gte("created_at", from.toISOString())
      .neq("status", "cancelled")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setOrders((data as OrderWithItems[]) || []);
        setLoading(false);
      });

    supabase
      .from("customer_reviews")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setReviews(data || []);
      });
  }, [user, period]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top dishes
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o) =>
      o.order_items.forEach((item) => {
        const existing = dishMap.get(item.item_name) || { name: item.item_name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += Number(item.item_price) * item.quantity;
        dishMap.set(item.item_name, existing);
      })
    );
    const topDishes = [...dishMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Daily revenue chart
    const dailyMap = new Map<string, number>();
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(o.total_amount));
    });
    const dailyRevenue = [...dailyMap.entries()].map(([day, revenue]) => ({ day, revenue }));

    // Hourly distribution
    const hourMap = new Map<number, number>();
    orders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const hourlyOrders = [...hourMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({
        hour: `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`,
        count,
      }));

    return { totalRevenue, totalOrders, avgOrder, topDishes, dailyRevenue, hourlyOrders };
  }, [orders]);

  const downloadCSV = () => {
    if (orders.length === 0) return;
    const rows = [["Order ID", "Date", "Time", "Table", "Items", "Total (₹)", "Status", "Phone"]];
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      const items = o.order_items.map((i) => `${i.quantity}x ${i.item_name}`).join("; ");
      rows.push([
        o.id.slice(0, 8),
        d.toLocaleDateString("en-IN"),
        d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        String(o.table_number || ""),
        `"${items}"`,
        String(o.total_amount),
        o.status,
        o.customer_phone || "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareOnWhatsApp = () => {
    const periodLabel = period === "today" ? "Today" : period === "7days" ? "Last 7 Days" : "Last 30 Days";
    const topItems = stats.topDishes.slice(0, 5).map((d, i) => `  ${i + 1}. ${d.name} — ${d.qty} sold`).join("\n");
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "N/A";

    const message = [
      `📊 *Sales Summary — ${periodLabel}*`,
      ``,
      `💰 Revenue: ₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      `🛒 Orders: ${stats.totalOrders}`,
      `📈 Avg Order: ₹${stats.avgOrder.toFixed(0)}`,
      `⭐ Rating: ${avgRating} (${reviews.length} reviews)`,
      ``,
      `🏆 *Top Dishes:*`,
      topItems || "  No data",
      ``,
      `— Powered by Adruva Resto 🍽️`,
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <OwnerLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={shareOnWhatsApp} disabled={orders.length === 0} className="gap-1.5">
            <MessageCircle className="w-4 h-4" /> Share Summary
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={orders.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          {([["today", "Today"], ["7days", "7 Days"], ["30days", "30 Days"]] as [Period, string][]).map(
            ([key, label]) => (
              <Button
                key={key}
                variant={period === key ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(key)}
              >
                {label}
              </Button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-display text-xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="font-display text-xl font-bold text-foreground">{stats.totalOrders}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                  <p className="font-display text-xl font-bold text-foreground">₹{stats.avgOrder.toFixed(0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Top Dish</p>
                  <p className="font-display text-sm font-bold text-foreground truncate max-w-[120px]">
                    {stats.topDishes[0]?.name || "—"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Revenue */}
            <Card className="p-4">
              <h2 className="font-display font-bold text-foreground mb-4">Daily Revenue</h2>
              {stats.dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.dailyRevenue}>
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v: number) => [`₹${v}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
              )}
            </Card>

            {/* Top Dishes Pie */}
            <Card className="p-4">
              <h2 className="font-display font-bold text-foreground mb-4">Top Dishes</h2>
              {stats.topDishes.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={180} className="sm:w-1/2">
                    <PieChart>
                      <Pie
                        data={stats.topDishes}
                        dataKey="qty"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        strokeWidth={2}
                      >
                        {stats.topDishes.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`${v} sold`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full sm:flex-1 space-y-2">
                    {stats.topDishes.map((dish, i) => (
                      <div key={dish.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-foreground truncate">{dish.name}</span>
                        <span className="text-muted-foreground ml-auto">{dish.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
              )}
            </Card>
          </div>

          {/* Hourly distribution */}
          <Card className="p-4">
            <h2 className="font-display font-bold text-foreground mb-4">Orders by Hour</h2>
            {stats.hourlyOrders.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.hourlyOrders}>
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">No data for this period</p>
            )}
          </Card>
          {/* Reviews Section */}
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            {/* Average Rating Card */}
            <Card className="p-5 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Star className="w-7 h-7 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Average Rating</p>
              <p className="font-display text-3xl font-bold text-foreground">
                {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"}
              </p>
              <div className="flex gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
                  return (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(avg) ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
            </Card>

            {/* Rating Distribution */}
            <Card className="p-5">
              <h2 className="font-display font-bold text-foreground mb-4">Rating Distribution</h2>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => r.rating === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-4 text-muted-foreground">{star}</span>
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent Reviews with Reply */}
            <Card className="p-5">
              <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Recent Feedback
              </h2>
              {reviews.filter((r) => r.comment).length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {reviews
                    .filter((r) => r.comment)
                    .slice(0, 10)
                    .map((r) => (
                      <ReviewCard key={r.id} review={r} onReplied={(id, text) => {
                        setReviews(prev => prev.map(rv => rv.id === id ? { ...rv, owner_reply: text, replied_at: new Date().toISOString() } : rv));
                      }} />
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-6">No feedback yet</p>
              )}
            </Card>
          </div>
        </>
      )}
    </OwnerLayout>
  );
};

export default OwnerAnalytics;
