import { useCallback, useEffect, useState, useRef, type ElementType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OwnerLayout from "@/components/OwnerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X, Store, Clock, Phone, CreditCard, MapPin, FileText, Image, Navigation, Loader2, Radar } from "lucide-react";
import CouponManager from "@/components/settings/CouponManager";
import MenuCustomization from "@/components/settings/MenuCustomization";
import { Slider } from "@/components/ui/slider";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { compressImageToWebP } from "@/lib/menu-image";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  dashboardThemePresets,
  getDashboardThemeStorageKey,
  type DashboardThemeKey,
} from "@/lib/dashboardThemes";
import {
  normalizeUnsignedDecimalInput,
  parseNonNegativeNumber,
} from "@/lib/number-input";
import { ensureProfileExists } from "@/lib/profile";
import { getRestaurantLogoUrl } from "@/lib/restaurantLogo";

type ProfileForm = {
  restaurant_name: string;
  upi_id: string;
  phone: string;
  address: string;
  gst_number: string;
  gst_percentage: string;
  opening_hours: string;
  closing_hours: string;
};

type FieldProps = {
  icon: ElementType;
  label: string;
  field: keyof ProfileForm;
  placeholder: string;
  value: string;
  type?: string;
  onChange: (field: keyof ProfileForm, value: string) => void;
};

const SettingsField = ({
  icon: Icon,
  label,
  field,
  placeholder,
  value,
  type = "text",
  onChange,
}: FieldProps) => (
  <div>
    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </label>
    <Input
      type={type}
      value={value}
      onChange={(event) => onChange(field, event.target.value)}
      placeholder={placeholder}
      className="h-11"
    />
  </div>
);

const OwnerSettings = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [form, setForm] = useState<ProfileForm>({
    restaurant_name: "",
    upi_id: "",
    phone: "",
    address: "",
    gst_number: "",
    gst_percentage: "5",
    opening_hours: "",
    closing_hours: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsRange, setGpsRange] = useState(200);
  const [dashboardTheme, setDashboardTheme] = useState<DashboardThemeKey>("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notifyProfileUpdated = () => {
    window.dispatchEvent(new Event("owner-profile-updated"));
  };
  const notifyDashboardThemeUpdated = () => {
    window.dispatchEvent(new Event("owner-dashboard-theme-updated"));
  };

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    await ensureProfileExists(user);
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) return;

    setForm({
      restaurant_name: data.restaurant_name || "",
      upi_id: data.upi_id || "",
      phone: data.phone || "",
      address: data.address || "",
      gst_number: data.gst_number || "",
      gst_percentage: String(data.gst_percentage ?? 5),
      opening_hours: data.opening_hours || "",
      closing_hours: data.closing_hours || "",
    });
    setLogoUrl(getRestaurantLogoUrl(data.restaurant_logo_url, Date.now()));
    if (data.gps_latitude) {
      setGpsLat(data.gps_latitude);
      setGpsLng(data.gps_longitude);
      setGpsCoords(`${data.gps_latitude}, ${data.gps_longitude}`);
    }
    if (data.gps_range_meters) setGpsRange(data.gps_range_meters);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const savedTheme = window.localStorage.getItem(getDashboardThemeStorageKey(user.id)) as DashboardThemeKey | null;
    setDashboardTheme(savedTheme && dashboardThemePresets[savedTheme] ? savedTheme : "default");
  }, [user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const uploadLogo = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      await ensureProfileExists(user);
      const compressedFile = await compressImageToWebP(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.82,
      });
      const path = `${user.id}/logo.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("restaurant-logos")
        .upload(path, compressedFile, { upsert: true, cacheControl: "3600" });
      if (uploadErr) throw uploadErr;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ restaurant_logo_url: path })
        .eq("user_id", user.id);
      if (profileError) throw profileError;
      setLogoUrl(getRestaurantLogoUrl(path, Date.now()));
      await fetchProfile();
      notifyProfileUpdated();
      toast.success(t("settings.logoUploaded"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.logoUploadFailed");
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!user) return;
    await ensureProfileExists(user);
    const { error } = await supabase
      .from("profiles")
      .update({ restaurant_logo_url: null })
      .eq("user_id", user.id);
    if (error) {
      toast.error(t("settings.logoRemoveFailed"));
      return;
    }
    setLogoUrl(null);
    await fetchProfile();
    notifyProfileUpdated();
    toast.success(t("settings.logoRemoved"));
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    await ensureProfileExists(user);
    const gstPercentage = parseNonNegativeNumber(form.gst_percentage);
    if (gstPercentage === null || gstPercentage > 28) {
      toast.error(language === "hi" ? "GST प्रतिशत 0 से 28 के बीच होना चाहिए" : "GST percentage must be between 0 and 28");
      setLoading(false);
      return;
    }
    const updateData: TablesUpdate<"profiles"> = {
      ...form,
      gst_percentage: gstPercentage,
      gps_latitude: gpsLat,
      gps_longitude: gpsLng,
      gps_range_meters: gpsRange,
    };
    const { error } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);
    if (error) toast.error(t("settings.saveFailed"));
    else {
      await fetchProfile();
      notifyProfileUpdated();
      toast.success(t("settings.savedSuccess"));
    }
    setLoading(false);
  };

  const detectGPS = async () => {
    if (!navigator.geolocation) {
      toast.error(t("settings.gpsUnsupported"));
      return;
    }
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGpsLat(latitude);
        setGpsLng(longitude);
        setGpsCoords(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
            headers: { "Accept-Language": "en" },
          });
          const data = await res.json();
          if (data.display_name) {
            setForm((prev) => ({ ...prev, address: data.display_name }));
            toast.success(t("settings.locationDetected"));
          }
        } catch {
          toast.error(t("settings.fetchAddressFailed"));
        }
        setDetectingGPS(false);
      },
      (err) => {
        toast.error(err.code === 1 ? t("settings.locationDenied") : t("settings.locationFailed"));
        setDetectingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyDashboardTheme = (themeKey: DashboardThemeKey) => {
    if (!user) return;
    window.localStorage.setItem(getDashboardThemeStorageKey(user.id), themeKey);
    setDashboardTheme(themeKey);
    notifyDashboardThemeUpdated();
    toast.success(language === "hi" ? "डैशबोर्ड थीम अपडेट हो गई" : "Dashboard theme updated");
  };

  return (
    <OwnerLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">{t("settings.title")}</h1>

        <div className="space-y-6">
          {/* Section: Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" /> {t("settings.restaurantInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4 text-muted-foreground" /> {t("settings.logo")}
                </label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative">
                      <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
                      <button onClick={removeLogo} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">{t("settings.upload")}</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  {logoUrl && (
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? t("settings.uploading") : t("settings.change")}
                    </Button>
                  )}
                </div>
              </div>
              <SettingsField icon={Store} label={t("settings.restaurantName")} field="restaurant_name" value={form.restaurant_name} onChange={updateField} placeholder={language === "hi" ? "Jaise Sharma Ji Ka Dhaba" : "e.g. Sharma Ji Ka Dhaba"} />
              <SettingsField icon={Phone} label={t("settings.phone")} field="phone" value={form.phone} onChange={updateField} placeholder="+91 98765 43210" type="tel" />
            </CardContent>
          </Card>

          {/* Section: Timing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> {t("settings.timing")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> {t("settings.opensAt")}
                  </label>
                  <Input type="time" value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> {t("settings.closesAt")}
                  </label>
                  <Input type="time" value={form.closing_hours} onChange={(e) => setForm({ ...form, closing_hours: e.target.value })} className="h-11" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: GST & Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> {t("settings.gstLocation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingsField icon={FileText} label={t("settings.gstNumber")} field="gst_number" value={form.gst_number} onChange={updateField} placeholder="e.g. 29ABCDE1234F1Z5" />
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {t("settings.gstPercentage")}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={28}
                  step={0.5}
                  value={form.gst_percentage}
                  onChange={(e) => setForm({ ...form, gst_percentage: normalizeUnsignedDecimalInput(e.target.value) })}
                  placeholder="e.g. 5"
                  className="h-11"
                />
              </div>
              <SettingsField icon={MapPin} label={t("settings.address")} field="address" value={form.address} onChange={updateField} placeholder={language === "hi" ? "Jaise 123, MG Road, Bengaluru" : "e.g. 123, MG Road, Bengaluru"} />

              {/* GPS Auto-detect */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={detectGPS}
                  disabled={detectingGPS}
                  className="gap-1.5"
                >
                  {detectingGPS ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {detectingGPS ? t("settings.detecting") : t("settings.autoDetect")}
                </Button>
                {gpsCoords && (
                  <span className="text-xs text-muted-foreground">📍 {gpsCoords}</span>
                )}
              </div>

              {/* GPS Range for Order Verification */}
              {gpsLat && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Radar className="w-4 h-4 text-primary" /> {t("settings.orderDiameter")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.orderDiameterHint")}
                  </p>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[gpsRange]}
                      onValueChange={(v) => setGpsRange(v[0])}
                      min={1}
                      max={1000}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-foreground min-w-[60px] text-right">{gpsRange}m</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1m</span>
                    <span>500m</span>
                    <span>1km</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section: Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> {t("settings.payment")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsField icon={CreditCard} label={t("settings.upi")} field="upi_id" value={form.upi_id} onChange={updateField} placeholder="e.g. restaurant@upi" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" /> {language === "hi" ? "डैशबोर्ड थीम" : "Dashboard Theme"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === "hi"
                  ? "Default ke saath 4 extra presets. Yeh sirf owner dashboard shell ko change karega, menu theme ko nahi."
                  : "Choose the default style or 4 extra presets. This only changes the owner dashboard shell, not the menu theme."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.values(dashboardThemePresets).map((preset) => {
                  const isActive = dashboardTheme === preset.key;

                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyDashboardTheme(preset.key)}
                      className={`rounded-xl border p-4 text-left transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="mb-3 flex gap-2">
                        <span className={`h-8 flex-1 rounded-md border ${preset.headerClass}`} />
                        <span className={`h-8 w-14 rounded-md border ${preset.navActiveClass}`} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{preset.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                        </div>
                        {isActive ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {language === "hi" ? "लागू" : "Applied"}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Menu Personalization */}
          {user && <MenuCustomization userId={user.id} />}

          {/* Discount Coupons */}
          {user && <CouponManager userId={user.id} />}

          {/* Save */}
          <Button variant="hero" onClick={save} disabled={loading || uploading} className="w-full h-12">
            {uploading ? t("settings.uploading") : loading ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
};

export default OwnerSettings;
