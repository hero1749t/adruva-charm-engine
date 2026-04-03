import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChefHat,
  DoorOpen,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Phone,
  QrCode,
  Receipt,
  Settings,
  Shield,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOwnerPlan } from "@/hooks/useOwnerPlan";
import { useStaffRole } from "@/hooks/useStaffRole";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { getRestaurantLogoUrl } from "@/lib/restaurantLogo";
import {
  dashboardThemePresets,
  getDashboardThemeStorageKey,
  type DashboardThemeKey,
} from "@/lib/dashboardThemes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

type OwnerProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "restaurant_logo_url" | "restaurant_name"
>;

type OwnerNavLink = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  visible?: boolean;
};

const OwnerSidebarLinks = ({
  links,
  themePreset,
  onNavigate,
}: {
  links: OwnerNavLink[];
  themePreset: (typeof dashboardThemePresets)[DashboardThemeKey];
  onNavigate?: () => void;
}) => (
  <>
    {links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            isActive ? themePreset.navActiveClass : themePreset.navInactiveClass,
          )
        }
      >
        <link.icon className="w-4 h-4" />
        <span className="flex-1">{link.label}</span>
        {link.badge && link.badge > 0 ? (
          <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
            {link.badge}
          </span>
        ) : null}
      </NavLink>
    ))}
  </>
);

const OwnerLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { ownerId, isOwner, isManager, isKitchen, isCashier, canViewAnalytics, canManageMenu, canManageStaff } = useStaffRole();
  const { plan } = useOwnerPlan();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [logoVersion, setLogoVersion] = useState(() => Date.now());
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [dashboardTheme, setDashboardTheme] = useState<DashboardThemeKey>("default");
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchNewOrderCount = useCallback(async () => {
    if (!ownerId) return;
    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("status", "new");
    if (!error && count !== null) setNewOrderCount(count);
  }, [ownerId]);

  useEffect(() => {
    fetchNewOrderCount();
  }, [fetchNewOrderCount]);

  useEffect(() => {
    if (!ownerId) return;
    const channel = supabase
      .channel("sidebar-new-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${ownerId}` }, () => fetchNewOrderCount())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNewOrderCount, ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    const fetchOwnerChrome = async () => {
      const profileRes = await supabase
        .from("profiles")
        .select("restaurant_logo_url, restaurant_name")
        .eq("user_id", ownerId)
        .maybeSingle();
      setProfile(profileRes.data ?? null);
      setLogoLoadFailed(false);
      setLogoVersion(Date.now());
    };

    void fetchOwnerChrome();

    const handleOwnerProfileUpdated = () => {
      void fetchOwnerChrome();
    };

    window.addEventListener("owner-profile-updated", handleOwnerProfileUpdated);
    return () => {
      window.removeEventListener("owner-profile-updated", handleOwnerProfileUpdated);
    };
  }, [ownerId, location.pathname]);

  useEffect(() => {
    if (!ownerId) return;

    const loadTheme = () => {
      const savedTheme = window.localStorage.getItem(getDashboardThemeStorageKey(ownerId)) as DashboardThemeKey | null;
      setDashboardTheme(savedTheme && dashboardThemePresets[savedTheme] ? savedTheme : "default");
    };

    loadTheme();
    window.addEventListener("owner-dashboard-theme-updated", loadTheme);
    return () => {
      window.removeEventListener("owner-dashboard-theme-updated", loadTheme);
    };
  }, [ownerId]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const themePreset = dashboardThemePresets[dashboardTheme];
  const customHeaderTheme = dashboardTheme !== "default";
  const headerActionClass = customHeaderTheme
    ? "text-current hover:opacity-80"
    : "text-muted-foreground hover:text-foreground";

  const handleSignOut = async () => {
    await signOut();
    navigate("/owner/login");
  };

  const allLinks: OwnerNavLink[] = [
    { to: "/owner/dashboard", icon: LayoutDashboard, label: t("owner.orders"), badge: newOrderCount, visible: isOwner || isManager },
    { to: "/owner/cashier", icon: Receipt, label: t("owner.billing"), visible: isCashier || isOwner || isManager },
    { to: "/owner/analytics", icon: BarChart3, label: t("owner.analytics"), visible: canViewAnalytics && plan.featureAnalytics },
    { to: "/owner/menu", icon: UtensilsCrossed, label: t("owner.menu"), visible: canManageMenu && plan.maxMenuItems > 0 },
    { to: "/owner/kitchen", icon: ChefHat, label: t("owner.kitchen"), visible: (isOwner || isManager || isKitchen) && plan.featureKitchenDisplay },
    { to: "/owner/inventory", icon: Package, label: t("owner.inventory"), visible: (isOwner || isManager) && plan.featureInventory },
    { to: "/owner/tables", icon: QrCode, label: t("owner.tables"), visible: (isOwner || isManager) && plan.maxTables > 0 },
    { to: "/owner/rooms", icon: DoorOpen, label: t("owner.rooms"), visible: (isOwner || isManager) && plan.maxRooms > 0 },
    { to: "/owner/expenses", icon: Wallet, label: t("owner.expenses"), visible: (isOwner || isManager) && plan.featureExpenses },
    { to: "/owner/customers", icon: Users, label: t("owner.customers"), visible: isOwner && plan.featureCustomerReviews },
    { to: "/owner/staff", icon: Shield, label: t("owner.staff"), visible: canManageStaff && plan.maxStaff > 0 },
    { to: "/owner/chain", icon: Building2, label: t("owner.chain"), visible: isOwner && plan.featureChain },
    { to: "/owner/settings", icon: Settings, label: t("owner.settings"), visible: isOwner },
    { to: "/install", icon: Download, label: t("owner.install") },
  ];

  const sidebarLinks = allLinks.filter((link) => link.visible !== false);

  return (
    <div className={cn("min-h-screen", themePreset.shellClass)}>
      <header className={cn("h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 border-b", themePreset.headerClass)}>
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn("md:hidden h-9 w-9 p-0", headerActionClass)}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <a href="/" className="font-display text-xl font-bold flex items-center gap-2">
            <span className="text-primary">ADRU</span>
            <span className={customHeaderTheme ? "text-current" : "text-foreground"}>vaa</span>
          </a>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
          <LanguageToggle className={headerActionClass} />
          <ThemeToggle className={headerActionClass} />
          <NavLink to="/install" className="md:hidden">
            <Button variant="ghost" size="sm" className={`${headerActionClass} h-9 w-9 p-0`}>
              <Download className="w-4 h-4" />
            </Button>
          </NavLink>
          <div className={cn("flex min-w-0 items-center gap-2 rounded-full border px-2 py-1", customHeaderTheme ? "border-white/15 bg-white/10" : "border-border bg-background/80")}>
            {profile?.restaurant_logo_url && !logoLoadFailed ? (
              <img
                src={getRestaurantLogoUrl(profile.restaurant_logo_url, logoVersion) || undefined}
                alt={profile.restaurant_name || "Restaurant logo"}
                className="h-8 w-8 shrink-0 rounded-full border border-border object-cover bg-muted"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold", themePreset.logoBadgeClass)}>
                {(profile?.restaurant_name || user?.email || "R").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden min-w-0 sm:flex flex-col leading-tight">
              {profile?.restaurant_name ? (
                <span className="hidden md:inline text-sm font-medium truncate max-w-[180px]">{profile.restaurant_name}</span>
              ) : null}
              <span className={`hidden md:inline text-xs truncate max-w-[180px] ${customHeaderTheme ? "text-white/75" : "text-muted-foreground"}`}>
                {user?.email}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className={cn("h-9 px-2 md:px-3", headerActionClass)}>
            <LogOut className="w-4 h-4 md:mr-1" /> <span className="hidden md:inline">{t("owner.logout")}</span>
          </Button>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] border-border p-0">
          <div className={cn("flex h-full flex-col", themePreset.sidebarClass)}>
            <div className="border-b border-border px-4 py-4">
              <div className="font-display text-lg font-semibold flex items-center gap-2">
                <span className="text-primary">ADRU</span>
                <span className="text-foreground">vaa</span>
              </div>
              {profile?.restaurant_name ? (
                <p className="mt-1 text-sm text-muted-foreground truncate">{profile.restaurant_name}</p>
              ) : null}
            </div>

            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-0.5">
                <OwnerSidebarLinks links={sidebarLinks} themePreset={themePreset} onNavigate={() => setMobileOpen(false)} />
              </div>

              <div className="mt-4 border-t border-border pt-4 space-y-1">
                {plan.hasPlan && (
                  <div className="px-3 py-2 mb-2">
                    <Badge variant="outline" className="text-xs">{plan.planName}</Badge>
                    {plan.expiresAt && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Exp: {new Date(plan.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                <a
                  href="https://wa.me/918383877088"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", themePreset.supportLinkClass)}
                >
                  <MessageCircle className="w-4 h-4 text-success" /> {t("owner.support.whatsapp")}
                </a>
                <a
                  href="tel:+918383877088"
                  className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", themePreset.supportLinkClass)}
                >
                  <Phone className="w-4 h-4 text-primary" /> +91 83838 77088
                </a>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex">
        <aside className={cn("hidden md:flex flex-col w-56 border-r min-h-[calc(100vh-3.5rem)] p-3 gap-0.5", themePreset.sidebarClass)}>
          <OwnerSidebarLinks links={sidebarLinks} themePreset={themePreset} />

          <div className="mt-auto pt-4 border-t border-border space-y-1">
            {plan.hasPlan && (
              <div className="px-3 py-2 mb-2">
                <Badge variant="outline" className="text-xs">{plan.planName}</Badge>
                {plan.expiresAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Exp: {new Date(plan.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            <a
              href="https://wa.me/918383877088"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", themePreset.supportLinkClass)}
            >
              <MessageCircle className="w-4 h-4 text-success" /> {t("owner.support.whatsapp")}
            </a>
            <a
              href="tel:+918383877088"
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", themePreset.supportLinkClass)}
            >
              <Phone className="w-4 h-4 text-primary" /> +91 83838 77088
            </a>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 pb-6 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
