import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Type } from "lucide-react";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Roboto",
  "Lora",
  "Nunito",
  "Raleway",
  "Montserrat",
  "Open Sans",
  "Dancing Script",
  "Satisfy",
  "Pacifico",
  "Caveat",
  "Lobster",
];

interface MenuCustomizationProps {
  userId: string;
}

type MenuCustomizationRow = Tables<"menu_customization">;
type MenuCustomizationForm = Pick<
  MenuCustomizationRow,
  | "primary_color"
  | "secondary_color"
  | "background_color"
  | "text_color"
  | "accent_color"
  | "font_heading"
  | "font_body"
>;

const MenuCustomization = ({ userId }: MenuCustomizationProps) => {
  const [form, setForm] = useState<MenuCustomizationForm>({
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
      .then(({ data }) => {
        if (!data) return;
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
      });
  }, [userId]);

  const save = async () => {
    setSaving(true);

    if (existingId) {
      const payload: TablesUpdate<"menu_customization"> = {
        ...form,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("menu_customization").update(payload).eq("id", existingId);
    } else {
      const payload: TablesInsert<"menu_customization"> = { ...form, owner_id: userId };
      const { data } = await supabase
        .from("menu_customization")
        .insert(payload)
        .select("id")
        .single();
      if (data) setExistingId(data.id);
    }

    toast.success("Personalization saved!");
    setSaving(false);
  };

  const ColorField = ({
    label,
    field,
  }: {
    label: string;
    field: keyof typeof form;
  }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={form[field]}
          onChange={(event) => setForm({ ...form, [field]: event.target.value })}
          className="h-8 w-8 cursor-pointer rounded-md border border-border"
        />
        <Input
          value={form[field]}
          onChange={(event) => setForm({ ...form, [field]: event.target.value })}
          className="h-8 w-24 font-mono text-xs"
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4 text-primary" /> Menu Personalization
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Customize your customer-facing menu colors, highlights, and fonts
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Colors
          </p>
          <ColorField label="Primary / Buttons" field="primary_color" />
          <ColorField label="Secondary / Header" field="secondary_color" />
          <ColorField label="Background" field="background_color" />
          <ColorField label="Text" field="text_color" />
          <ColorField label="Accent / Highlights" field="accent_color" />
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Type className="h-3.5 w-3.5" /> Fonts
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Heading Font
              </label>
              <Select
                value={form.font_heading}
                onValueChange={(value) =>
                  setForm({ ...form, font_heading: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Body Font
              </label>
              <Select
                value={form.font_body}
                onValueChange={(value) =>
                  setForm({ ...form, font_body: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: form.background_color,
            color: form.text_color,
            borderColor: `${form.accent_color}40`,
          }}
        >
          <p
            className="mb-2 text-center text-xs"
            style={{ color: `${form.text_color}80` }}
          >
            Preview
          </p>
          <h3
            className="mb-1 text-lg font-bold"
            style={{ fontFamily: form.font_heading, color: form.text_color }}
          >
            Customer Menu
          </h3>
          <p
            className="mb-2 text-sm"
            style={{ fontFamily: form.font_body, color: `${form.text_color}99` }}
          >
            Menu headings, buttons, and highlights will follow this style
          </p>
          <div className="flex items-center justify-between">
            <span
              className="font-bold"
              style={{ fontFamily: form.font_body, color: form.text_color }}
            >
              Live Preview
            </span>
            <button
              className="rounded-lg px-3 py-1 text-sm font-semibold text-white"
              style={{ backgroundColor: form.primary_color }}
            >
              Save
            </button>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Personalization"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MenuCustomization;
