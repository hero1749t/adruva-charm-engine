import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const OwnerSettings = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ restaurant_name: "", upi_id: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setForm({
          restaurant_name: data.restaurant_name || "",
          upi_id: data.upi_id || "",
          phone: data.phone || "",
        });
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(form).eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Settings saved!");
    setLoading(false);
  };

  return (
    <OwnerLayout>
      <div className="max-w-lg">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Restaurant Settings</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Restaurant Name</label>
            <Input value={form.restaurant_name} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} placeholder="e.g. Sharma Ji Ka Dhaba" className="h-12" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">UPI ID</label>
            <Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="e.g. restaurant@upi" className="h-12" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="h-12" />
          </div>
          <Button variant="hero" onClick={save} disabled={loading} className="w-full h-12">
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerSettings;
