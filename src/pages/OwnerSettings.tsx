import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, X, Store, Clock, Phone, CreditCard, MapPin, FileText, Image } from "lucide-react";

const OwnerSettings = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    restaurant_name: "",
    upi_id: "",
    phone: "",
    address: "",
    gst_number: "",
    opening_hours: "",
    closing_hours: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setForm({
          restaurant_name: data.restaurant_name || "",
          upi_id: data.upi_id || "",
          phone: data.phone || "",
          address: (data as any).address || "",
          gst_number: (data as any).gst_number || "",
          opening_hours: (data as any).opening_hours || "",
          closing_hours: (data as any).closing_hours || "",
        });
        if (data.restaurant_logo_url) setLogoUrl(data.restaurant_logo_url);
      }
    });
  }, [user]);

  const uploadLogo = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("restaurant-logos")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error("Logo upload failed");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("restaurant-logos").getPublicUrl(path);
    const url = urlData.publicUrl + `?t=${Date.now()}`;

    await supabase.from("profiles").update({ restaurant_logo_url: url }).eq("user_id", user.id);
    setLogoUrl(url);
    toast.success("Logo uploaded!");
    setUploading(false);
  };

  const removeLogo = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ restaurant_logo_url: null }).eq("user_id", user.id);
    setLogoUrl(null);
    toast.success("Logo removed");
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(form as any).eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Settings saved!");
    setLoading(false);
  };

  const Field = ({ icon: Icon, label, field, placeholder, type = "text" }: { icon: any; label: string; field: string; placeholder: string; type?: string }) => (
    <div>
      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </label>
      <Input
        type={type}
        value={(form as any)[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
        className="h-12"
      />
    </div>
  );

  return (
    <OwnerLayout>
      <div className="max-w-lg">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Restaurant Settings</h1>

        {/* Logo Upload */}
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Image className="w-4 h-4 text-muted-foreground" />
            Restaurant Logo
          </label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative">
                <img
                  src={logoUrl}
                  alt="Restaurant logo"
                  className="w-20 h-20 rounded-2xl object-cover border border-border shadow-sm"
                />
                <button
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
              }}
            />
            {logoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Change Logo"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Field icon={Store} label="Restaurant Name" field="restaurant_name" placeholder="e.g. Sharma Ji Ka Dhaba" />
          <Field icon={Phone} label="Phone Number" field="phone" placeholder="+91 98765 43210" type="tel" />
          <Field icon={MapPin} label="Address" field="address" placeholder="e.g. 123, MG Road, Bengaluru" />
          <Field icon={CreditCard} label="UPI ID" field="upi_id" placeholder="e.g. restaurant@upi" />
          <Field icon={FileText} label="GST Number" field="gst_number" placeholder="e.g. 29ABCDE1234F1Z5" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Opens At
              </label>
              <Input
                type="time"
                value={form.opening_hours}
                onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Closes At
              </label>
              <Input
                type="time"
                value={form.closing_hours}
                onChange={(e) => setForm({ ...form, closing_hours: e.target.value })}
                className="h-12"
              />
            </div>
          </div>

          <Button variant="hero" onClick={save} disabled={loading} className="w-full h-12 mt-2">
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerSettings;
