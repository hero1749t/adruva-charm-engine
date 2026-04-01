import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Users, LogOut, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const links = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/plans", icon: Package, label: "Plans" },
    { to: "/admin/owners", icon: Users, label: "Owners" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-display text-xl font-bold">
            <span className="text-primary">ADRU</span>
            <span className="text-foreground">vaa</span>
            <span className="text-muted-foreground text-sm ml-2">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden md:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border min-h-[calc(100vh-3.5rem)] p-3 gap-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </aside>

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-6xl">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AdminLayout;
