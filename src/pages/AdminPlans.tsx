import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string;
  max_tables: number;
  max_rooms: number;
  max_menu_items: number;
  max_staff: number;
  max_orders_per_month: number;
  feature_analytics: boolean;
  feature_inventory: boolean;
  feature_expenses: boolean;
  feature_chain: boolean;
  feature_coupons: boolean;
  feature_online_orders: boolean;
  feature_kitchen_display: boolean;
  feature_customer_reviews: boolean;
  feature_white_label: boolean;
  is_active: boolean;
}

const emptyPlan: Omit<Plan, "id"> = {
  name: "",
  price: 0,
  billing_period: "monthly",
  max_tables: 5,
  max_rooms: 0,
  max_menu_items: 50,
  max_staff: 2,
  max_orders_per_month: 500,
  feature_analytics: false,
  feature_inventory: false,
  feature_expenses: false,
  feature_chain: false,
  feature_coupons: false,
  feature_online_orders: false,
  feature_kitchen_display: true,
  feature_customer_reviews: false,
  feature_white_label: false,
  is_active: true,
};

const featureLabels: Record<string, string> = {
  feature_analytics: "Analytics",
  feature_inventory: "Inventory",
  feature_expenses: "Expenses",
  feature_chain: "Chain Management",
  feature_coupons: "Discount Coupons",
  feature_online_orders: "Online Orders",
  feature_kitchen_display: "Kitchen Display",
  feature_customer_reviews: "Customer Reviews",
  feature_white_label: "White Label (Remove Branding)",
};

const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<Omit<Plan, "id">>(emptyPlan);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchPlans = async () => {
    const { data } = await supabase.from("subscription_plans").select("*").order("created_at");
    if (data) setPlans(data as Plan[]);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Plan name required", variant: "destructive" }); return; }

    if (editId) {
      const { error } = await supabase.from("subscription_plans").update(form).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Plan updated" });
    } else {
      const { error } = await supabase.from("subscription_plans").insert(form);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Plan created" });
    }
    setOpen(false);
    setForm(emptyPlan);
    setEditId(null);
    fetchPlans();
  };

  const handleEdit = (plan: Plan) => {
    const { id, ...rest } = plan;
    setForm(rest);
    setEditId(id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan deleted" });
    fetchPlans();
  };

  const featureKeys = Object.keys(featureLabels) as (keyof typeof featureLabels)[];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Subscription Plans</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyPlan); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Add Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Plan" : "Create Plan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plan Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Basic" />
                </div>
                <div>
                  <Label>Price (₹)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Billing Period</Label>
                <Select value={form.billing_period} onValueChange={(v) => setForm({ ...form, billing_period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-3">
                <Label className="text-base font-semibold">Limits</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><Label className="text-xs">Max Tables</Label><Input type="number" value={form.max_tables} onChange={(e) => setForm({ ...form, max_tables: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Max Rooms</Label><Input type="number" value={form.max_rooms} onChange={(e) => setForm({ ...form, max_rooms: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Max Menu Items</Label><Input type="number" value={form.max_menu_items} onChange={(e) => setForm({ ...form, max_menu_items: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Max Staff</Label><Input type="number" value={form.max_staff} onChange={(e) => setForm({ ...form, max_staff: Number(e.target.value) })} /></div>
                  <div className="col-span-2"><Label className="text-xs">Max Orders/Month</Label><Input type="number" value={form.max_orders_per_month} onChange={(e) => setForm({ ...form, max_orders_per_month: Number(e.target.value) })} /></div>
                </div>
              </div>

              <div className="border-t pt-3">
                <Label className="text-base font-semibold">Features</Label>
                <div className="space-y-2 mt-2">
                  {featureKeys.map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{featureLabels[key]}</Label>
                      <Switch checked={(form as any)[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <Label>Plan Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>

              <Button className="w-full" onClick={handleSave}>{editId ? "Update Plan" : "Create Plan"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">₹{plan.price}/{plan.billing_period}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mb-3">
                <div><span className="text-muted-foreground">Tables:</span> {plan.max_tables}</div>
                <div><span className="text-muted-foreground">Rooms:</span> {plan.max_rooms}</div>
                <div><span className="text-muted-foreground">Menu Items:</span> {plan.max_menu_items}</div>
                <div><span className="text-muted-foreground">Staff:</span> {plan.max_staff}</div>
                <div><span className="text-muted-foreground">Orders/mo:</span> {plan.max_orders_per_month}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {featureKeys.map((key) => (
                  (plan as any)[key] && <Badge key={key} variant="outline" className="text-xs">{featureLabels[key]}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No plans created yet. Click "Add Plan" to create one.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
