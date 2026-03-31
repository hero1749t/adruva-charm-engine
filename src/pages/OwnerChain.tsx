import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Trash2, MapPin, Phone, UserCircle, Edit2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Outlet {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
}

const OwnerChain = () => {
  const { user } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOutlet, setEditOutlet] = useState<Outlet | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", manager_name: "" });

  const fetchOutlets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("outlets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at");
    if (data) setOutlets(data as Outlet[]);
    setLoading(false);
  };

  useEffect(() => { fetchOutlets(); }, [user]);

  const resetForm = () => setForm({ name: "", address: "", phone: "", manager_name: "" });

  const openAdd = () => {
    resetForm();
    setEditOutlet(null);
    setDialogOpen(true);
  };

  const openEdit = (outlet: Outlet) => {
    setForm({
      name: outlet.name,
      address: outlet.address || "",
      phone: outlet.phone || "",
      manager_name: outlet.manager_name || "",
    });
    setEditOutlet(outlet);
    setDialogOpen(true);
  };

  const saveOutlet = async () => {
    if (!user || !form.name.trim()) {
      toast.error("Outlet name is required");
      return;
    }

    if (editOutlet) {
      const { error } = await supabase
        .from("outlets")
        .update({ name: form.name, address: form.address || null, phone: form.phone || null, manager_name: form.manager_name || null })
        .eq("id", editOutlet.id);
      if (error) toast.error("Failed to update");
      else toast.success("Outlet updated!");
    } else {
      const { error } = await supabase
        .from("outlets")
        .insert({ owner_id: user.id, name: form.name, address: form.address || null, phone: form.phone || null, manager_name: form.manager_name || null });
      if (error) toast.error("Failed to add outlet");
      else toast.success("Outlet added!");
    }
    setDialogOpen(false);
    fetchOutlets();
  };

  const deleteOutlet = async (id: string) => {
    if (!confirm("Remove this outlet?")) return;
    await supabase.from("outlets").delete().eq("id", id);
    toast.success("Outlet removed");
    fetchOutlets();
  };

  const toggleActive = async (outlet: Outlet) => {
    await supabase.from("outlets").update({ is_active: !outlet.is_active }).eq("id", outlet.id);
    fetchOutlets();
  };

  const activeCount = outlets.filter((o) => o.is_active).length;

  return (
    <OwnerLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Chain Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {outlets.length} outlet{outlets.length !== 1 ? "s" : ""} • {activeCount} active
          </p>
        </div>
        <Button variant="hero" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Outlet
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="font-display text-3xl font-bold text-foreground">{outlets.length}</p>
          <p className="text-xs text-muted-foreground">Total Outlets</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-display text-3xl font-bold text-green-500">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-display text-3xl font-bold text-muted-foreground">{outlets.length - activeCount}</p>
          <p className="text-xs text-muted-foreground">Inactive</p>
        </Card>
      </div>

      {/* Outlet list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : outlets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No outlets yet</p>
          <p className="text-sm mt-2">Add your first outlet to start managing your chain</p>
        </div>
      ) : (
        <div className="space-y-3">
          {outlets.map((outlet) => (
            <Card key={outlet.id} className={`transition-all ${!outlet.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <h3 className="font-display font-bold text-foreground truncate">{outlet.name}</h3>
                      <Badge variant={outlet.is_active ? "default" : "secondary"} className="text-[10px] flex-shrink-0">
                        {outlet.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="space-y-1 ml-6">
                      {outlet.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> {outlet.address}
                        </p>
                      )}
                      {outlet.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {outlet.phone}
                        </p>
                      )}
                      {outlet.manager_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <UserCircle className="w-3 h-3" /> {outlet.manager_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => toggleActive(outlet)}>
                      {outlet.is_active ? <X className="w-4 h-4 text-muted-foreground" /> : <Check className="w-4 h-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(outlet)}>
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => deleteOutlet(outlet.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editOutlet ? "Edit Outlet" : "Add Outlet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Outlet Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Downtown Branch" className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="mt-1" />
            </div>
            <div>
              <Label>Manager Name</Label>
              <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} placeholder="Manager's name" className="mt-1" />
            </div>
            <Button variant="hero" className="w-full" onClick={saveOutlet}>
              {editOutlet ? "Update Outlet" : "Add Outlet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
};

export default OwnerChain;
