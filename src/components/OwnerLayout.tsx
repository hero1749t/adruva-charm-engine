import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import { useOwnerPlan } from "@/hooks/useOwnerPlan";
import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, QrCode, Settings, LogOut, BarChart3, ChefHat, Download, Users, Shield, Receipt, MessageCircle, Phone, Package, Wallet, DoorOpen, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

const OwnerLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { isOwner, isManager, isKitchen, isCashier, canViewAnalytics, canManageMenu, canManageStaff } = useStaffRole();
  const { plan } = useOwnerPlan();
  const [newOrderCount, setNewOrderCount] = useState(0);

  const fetchNewOrderCount = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "new");
    if (!error && count !== null) setNewOrderCount(count);
  };

  useEffect(() => { fetchNewOrderCount(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("sidebar-new-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `owner_id=eq.${user.id}` }, () => fetchNewOrderCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/owner/login");
  };

  const allLinks = [
    { to: "/owner/dashboard", icon: LayoutDashboard, label: "Orders", badge: newOrderCount, visible: isOwner || isManager },
    { to: "/owner/cashier", icon: Receipt, label: "Billing", visible: isCashier || isOwner || isManager },
    { to: "/owner/analytics", icon: BarChart3, label: "Analytics", visible: canViewAnalytics && plan.featureAnalytics },
    { to: "/owner/menu", icon: UtensilsCrossed, label: "Menu", visible: canManageMenu && plan.maxMenuItems > 0 },
    { to: "/owner/kitchen", icon: ChefHat, label: "Kitchen", visible: (isOwner || isManager || isKitchen) && plan.featureKitchenDisplay },
    { to: "/owner/inventory", icon: Package, label: "Inventory", visible: (isOwner || isManager) && plan.featureInventory },
    { to: "/owner/tables", icon: QrCode, label: "Tables & QR", visible: (isOwner || isManager) && plan.maxTables > 0 },
    { to: "/owner/rooms", icon: DoorOpen, label: "Rooms & QR", visible: (isOwner || isManager) && plan.maxRooms > 0 },
    { to: "/owner/expenses", icon: Wallet, label: "Expenses", visible: (isOwner || isManager) && plan.featureExpenses },
    { to: "/owner/customers", icon: Users, label: "Customers", visible: isOwner && plan.featureCustomerReviews },
    { to: "/owner/staff", icon: Shield, label: "Staff", visible: canManageStaff && plan.maxStaff > 0 },
    { to: "/owner/chain", icon: Building2, label: "Chain", visible: isOwner && plan.featureChain },
    { to: "/owner/settings", icon: Settings, label: "Settings", visible: isOwner },
    { to: "/install", icon: Download, label: "Install App" },
  ];

  const sidebarLinks = allLinks.filter((link) => link.visible !== false);
  const mobileLinks = sidebarLinks.filter((link) => link.to !== "/install");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-card h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 border-b border-border">
        <a href="/" className="font-display text-xl font-bold">
          <span className="text-primary">ADRU</span>
          <span className="text-foreground">vaa</span>
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NavLink to="/install" className="md:hidden">
            <Button variant="ghost" size="sm" className="text-muted-foreground h-9 w-9 p-0">
              <Download className="w-4 h-4" />
            </Button>
          </NavLink>
          <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[150px]">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 md:mr-1" /> <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border min-h-[calc(100vh-3.5rem)] p-3 gap-0.5">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
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
            <a href="https://wa.me/918383877088" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
              <MessageCircle className="w-4 h-4 text-success" /> WhatsApp Support
            </a>
            <a href="tel:+918383877088"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
              <Phone className="w-4 h-4 text-primary" /> +91 83838 77088
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-6xl">{children}</main>
      </div>

      {/* Bottom nav - mobile — horizontally scrollable */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide gap-0 py-1.5 px-1">
          {mobileLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 min-w-[4rem] px-2 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`
              }
            >
              <div className="relative">
                <link.icon className="w-5 h-5" />
                {link.badge && link.badge > 0 ? (
                  <span className="absolute -top-1 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {link.badge}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-[3.5rem] leading-tight">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default OwnerLayout;
