import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, QrCode, Settings, LogOut, BarChart3, ChefHat, Download } from "lucide-react";

const OwnerLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/owner/login");
  };

  const links = [
    { to: "/owner/dashboard", icon: LayoutDashboard, label: "Orders" },
    { to: "/owner/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/owner/menu", icon: UtensilsCrossed, label: "Menu" },
    { to: "/owner/kitchen", icon: ChefHat, label: "Kitchen" },
    { to: "/owner/tables", icon: QrCode, label: "Tables & QR" },
    { to: "/owner/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* Top bar */}
      <header className="bg-secondary h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
        <a href="/" className="font-display text-xl font-bold">
          <span className="text-primary">ADRU</span>
          <span className="text-secondary-foreground">vaa</span>
        </a>
        <div className="flex items-center gap-4">
          <span className="text-sm text-secondary-foreground/60 hidden md:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-secondary-foreground/60 hover:text-secondary-foreground">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border min-h-[calc(100vh-3.5rem)] p-4 gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-6xl">{children}</main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-xs ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default OwnerLayout;
