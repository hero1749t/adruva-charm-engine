import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Calendar, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Owner {
  id: string;
  user_id: string;
  full_name: string | null;
  restaurant_name: string | null;
  phone: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  owner_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  subscription_plans: { name: string; price: number } | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

const AdminOwners = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const [ownersRes, subsRes, plansRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("owner_subscriptions").select("*, subscription_plans(name, price)"),
      supabase.from("subscription_plans").select("id, name, price").eq("is_active", true),
    ]);
    if (ownersRes.data) setOwners(ownersRes.data as Owner[]);
    if (subsRes.data) setSubscriptions(subsRes.data as Subscription[]);
    if (plansRes.data) setPlans(plansRes.data as Plan[]);
  };

  useEffect(() => { fetchData(); }, []);

  const getOwnerSub = (ownerId: string) =>
    subscriptions.find((s) => s.owner_id === ownerId && s.status === "active");

  const handleAssign = async () => {
    if (!selectedOwner || !selectedPlanId || !user) return;

    // Deactivate existing
    await supabase
      .from("owner_subscriptions")
      .update({ status: "expired" } as any)
      .eq("owner_id", selectedOwner.user_id)
      .eq("status", "active");

    const { error } = await supabase.from("owner_subscriptions").insert({
      owner_id: selectedOwner.user_id,
      plan_id: selectedPlanId,
      assigned_by: user.id,
      status: "active",
      expires_at: expiresAt || null,
    });

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan assigned successfully" });
    setAssignOpen(false);
    setSelectedOwner(null);
    setSelectedPlanId("");
    setExpiresAt("");
    fetchData();
  };

  const handleRevoke = async (subId: string) => {
    await supabase.from("owner_subscriptions").update({ status: "suspended" } as any).eq("id", subId);
    toast({ title: "Subscription suspended" });
    fetchData();
  };

  const filtered = owners.filter((o) => {
    const q = search.toLowerCase();
    return !q || (o.restaurant_name || "").toLowerCase().includes(q) || (o.full_name || "").toLowerCase().includes(q) || (o.phone || "").includes(q);
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Owner Management</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search by name, restaurant, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map((owner) => {
          const sub = getOwnerSub(owner.user_id);
          return (
            <Card key={owner.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{owner.restaurant_name || "Unnamed Restaurant"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{owner.full_name} • {owner.phone || "No phone"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {sub ? (
                    <>
                      <Badge variant="default">{(sub.subscription_plans as any)?.name}</Badge>
                      {sub.expires_at && (
                        <span className="text-xs text-muted-foreground">
                          Exp: {format(new Date(sub.expires_at), "dd MMM yyyy")}
                        </span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleRevoke(sub.id)}>Suspend</Button>
                    </>
                  ) : (
                    <Badge variant="secondary">No Plan</Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => { setSelectedOwner(owner); setAssignOpen(true); }}
                  >
                    <Package className="w-3 h-3 mr-1" /> {sub ? "Change" : "Assign"} Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Joined: {format(new Date(owner.created_at), "dd MMM yyyy")}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Plan to {selectedOwner?.restaurant_name || "Owner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ₹{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expires At (optional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleAssign} disabled={!selectedPlanId}>Assign Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOwners;
