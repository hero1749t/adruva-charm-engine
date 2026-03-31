import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Type } from "lucide-react";

const FONT_OPTIONS = [
  "Inter", "Poppins", "Playfair Display", "Merriweather", "Roboto",
  "Lora", "Nunito", "Raleway", "Montserrat", "Open Sans",
  "Dancing Script", "Satisfy", "Pacifico", "Caveat", "Lobster",
];

interface MenuCustomizationProps {
  userId: string;
}

const MenuCustomization = ({ userId }: MenuCustomizationProps) => {
  const [form, setForm] = useState({
    primary_color: "#FF6B00",
    secondary_color: "#1a1a2e",
    background_color: "#ffffff",
    text_color: "#1a1a2e",
    accent_color: "#FF6B00",
    font_heading: "Inter",
    font_body: "Inter",
  });
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("menu_customization")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            background_color: data.background_color,
            text_color: data.text_color,
            accent_color: data.accent_color,
            font_heading: data.font_heading,
            font_body: data.font_body,
          });
        }
      });
  }, [userId]);

  const save = async () => {
    setSaving(true);
    if (existingId) {
      await supabase.from("menu_customization").update({ ...form, updated_at: new Date().toISOString() } as any).eq("id", existingId);
    } else {
      const { data } = await supabase.from("menu_customization").insert({ ...form, owner_id: userId } as any).select().single();
      if (data) setExistingId((data as any).id);
    }
    toast.success("Menu style saved!");
    setSaving(false);
  };

  const ColorField = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={form[field]}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="w-8 h-8 rounded-md border border-border cursor-pointer"
        />
        <Input
          value={form[field]}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="w-24 h-8 text-xs font-mono"
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Menu Personalization
        </CardTitle>
        <p className="text-xs text-muted-foreground">Customize how your customer menu looks</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Colors */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colors</p>
          <ColorField label="Primary / Buttons" field="primary_color" />
          <ColorField label="Secondary" field="secondary_color" />
          <ColorField label="Background" field="background_color" />
          <ColorField label="Text" field="text_color" />
          <ColorField label="Accent / Highlights" field="accent_color" />
        </div>

        {/* Fonts */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" /> Fonts
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Heading Font</label>
              <Select value={form.font_heading} onValueChange={(v) => setForm({ ...form, font_heading: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      <span style={{ fontFamily: f }}>{f}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Body Font</label>
              <Select value={form.font_body} onValueChange={(v) => setForm({ ...form, font_body: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      <span style={{ fontFamily: f }}>{f}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: form.background_color, color: form.text_color, borderColor: form.accent_color + "40" }}
        >
          <p className="text-xs text-center mb-2" style={{ color: form.text_color + "80" }}>Preview</p>
          <h3 className="text-lg font-bold mb-1" style={{ fontFamily: form.font_heading, color: form.text_color }}>
            Paneer Butter Masala
          </h3>
          <p className="text-sm mb-2" style={{ fontFamily: form.font_body, color: form.text_color + "99" }}>
            Rich & creamy paneer curry
          </p>
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ fontFamily: form.font_body, color: form.text_color }}>₹280</span>
            <button
              className="px-3 py-1 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: form.primary_color }}
            >
              Add +
            </button>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Menu Style"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MenuCustomization;
