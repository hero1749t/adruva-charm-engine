import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Ticket, Plus, Trash2, Percent, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses_per_person: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const CouponManager = ({ userId }: { userId: string }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "10",
    min_order_amount: "0",
    max_uses_per_person: "1",
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: "",
  });

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from("discount_coupons")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }) as any;
    if (data) setCoupons(data);
  };

  useEffect(() => {
    fetchCoupons();
  }, [userId]);

  const addCoupon = async () => {
    if (!form.code.trim()) { toast.error("Enter a coupon code"); return; }
    if (!form.valid_until) { toast.error("Set expiry date"); return; }
    setSaving(true);
    const { error } = await supabase.from("discount_coupons").insert({
      owner_id: userId,
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 10,
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_uses_per_person: parseInt(form.max_uses_per_person) || 1,
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until).toISOString(),
    } as any);
    if (error) toast.error("Failed to add coupon");
    else {
      toast.success("Coupon added!");
      setShowForm(false);
      setForm({ code: "", discount_type: "percentage", discount_value: "10", min_order_amount: "0", max_uses_per_person: "1", valid_from: new Date().toISOString().slice(0, 16), valid_until: "" });
      fetchCoupons();
    }
    setSaving(false);
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await supabase.from("discount_coupons").update({ is_active: active } as any).eq("id", id);
    setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, is_active: active } : c));
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("discount_coupons").delete().eq("id", id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast.success("Coupon deleted");
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" /> Discount Coupons
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add coupon form */}
        {showForm && (
          <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border">
            <Input
              placeholder="Coupon code (e.g. WELCOME20)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="h-11 font-mono uppercase"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({ ...form, discount_type: "percentage" })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${form.discount_type === "percentage" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}
                  >
                    <Percent className="w-3 h-3 inline mr-1" /> Percent
                  </button>
                  <button
                    onClick={() => setForm({ ...form, discount_type: "flat" })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${form.discount_type === "flat" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}
                  >
                    <IndianRupee className="w-3 h-3 inline mr-1" /> Flat
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Value ({form.discount_type === "percentage" ? "%" : "₹"})
                </label>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min Order (₹)</label>
                <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max Uses / Person</label>
                <Input type="number" value={form.max_uses_per_person} onChange={(e) => setForm({ ...form, max_uses_per_person: e.target.value })} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valid From</label>
                <Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valid Until</label>
                <Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="h-10" />
              </div>
            </div>
            <Button onClick={addCoupon} disabled={saving} className="w-full h-10">
              {saving ? "Saving..." : "Create Coupon"}
            </Button>
          </div>
        )}

        {/* Coupon list */}
        {coupons.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">No coupons yet. Add your first promo code!</p>
        )}
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-background rounded-xl border border-border p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground text-sm">{c.code}</span>
                {isExpired(c.valid_until) && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>}
                {!isExpired(c.valid_until) && c.is_active && <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">Active</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                {c.min_order_amount > 0 && ` • Min ₹${c.min_order_amount}`}
                {` • ${c.max_uses_per_person} use/person`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Until {new Date(c.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Switch checked={c.is_active} onCheckedChange={(v) => toggleCoupon(c.id, v)} />
              <button onClick={() => deleteCoupon(c.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CouponManager;
