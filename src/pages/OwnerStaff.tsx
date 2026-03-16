import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, UserCog, Trash2, Shield } from "lucide-react";
import { useStaffRole, type StaffRole } from "@/hooks/useStaffRole";

interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
}

const roleColors: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  manager: "bg-blue-500 text-primary-foreground",
  kitchen: "bg-yellow-500 text-foreground",
  cashier: "bg-green-500 text-primary-foreground",
};

const roleDescriptions: Record<string, string> = {
  owner: "Full access to everything",
  manager: "Manage menu, orders, analytics",
  kitchen: "Kitchen display access only",
  cashier: "Order management & billing",
};

const OwnerStaff = () => {
  const { user } = useAuth();
  const { canManageStaff } = useStaffRole();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "cashier" as StaffRole });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("staff_members")
      .select("*")
      .eq("restaurant_owner_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStaff(data as StaffMember[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [user]);

  const handleAddStaff = async () => {
    if (!user || !form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSubmitting(true);

    // First, we need to create an auth account for the staff member
    // For now, we'll use a placeholder user_id approach - the staff member
    // will need to sign up with their email, then the owner links them
    // In production, you'd use an invite system
    
    // Look up if user exists by checking profiles
    // For MVP: store with owner's ID as placeholder, staff claims later
    const { error } = await supabase.from("staff_members").insert({
      restaurant_owner_id: user.id,
      user_id: user.id, // Placeholder - in production use invite flow
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
    });

    if (error) {
      toast.error(error.message || "Failed to add staff member");
    } else {
      toast.success(`${form.name} added as ${form.role}`);
      setForm({ name: "", email: "", phone: "", role: "cashier" });
      setDialogOpen(false);
      fetchStaff();
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("staff_members")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(currentState ? "Staff deactivated" : "Staff activated");
      fetchStaff();
    }
  };

  const deleteStaff = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from staff?`)) return;
    const { error } = await supabase.from("staff_members").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
    } else {
      toast.success(`${name} removed`);
      fetchStaff();
    }
  };

  const updateRole = async (id: string, newRole: StaffRole) => {
    const { error } = await supabase
      .from("staff_members")
      .update({ role: newRole })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated");
      fetchStaff();
    }
  };

  return (
    <OwnerLayout>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Staff Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Apni team manage karo aur access control karo
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Staff member name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="staff@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Role *</label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as StaffRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roleDescriptions[form.role]}
                  </p>
                </div>
                <Button onClick={handleAddStaff} disabled={submitting} className="w-full">
                  {submitting ? "Adding..." : "Add Staff Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role legend - hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:flex flex-wrap gap-3 mb-6">
        {Object.entries(roleDescriptions).map(([role, desc]) => (
          <div key={role} className="flex items-center gap-2 text-sm">
            <Badge className={roleColors[role]}>{role}</Badge>
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No staff members yet</p>
          <p className="text-sm mt-2">Add your team members and assign them roles</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div
              key={member.id}
              className={`bg-card rounded-xl border border-border p-4 ${
                !member.is_active ? "opacity-50" : ""
              }`}
            >
              {/* Top row: avatar + name + badge */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <UserCog className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-foreground truncate">{member.name}</span>
                    {!member.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  {member.phone && (
                    <p className="text-sm text-muted-foreground">{member.phone}</p>
                  )}
                </div>
                <Badge className={`${roleColors[member.role]} text-xs flex-shrink-0`}>{member.role}</Badge>
              </div>

              {/* Bottom row: actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Select
                  value={member.role}
                  onValueChange={(v) => updateRole(member.id, v as StaffRole)}
                >
                  <SelectTrigger className="w-28 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 flex-1"
                  onClick={() => toggleActive(member.id, member.is_active)}
                >
                  {member.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-9 px-2"
                  onClick={() => deleteStaff(member.id, member.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerStaff;
