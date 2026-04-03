import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, Command, LogOut, Menu, Plus, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { adminNavItems } from "@/components/admin/adminConfig";
import { toast } from "sonner";

const SidebarContent = ({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) => {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className={cn("flex items-center gap-3 px-3", collapsed && "justify-center px-0")}>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-200">
          <Sparkles className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div>
            <p className="font-display text-lg font-semibold text-slate-900">Adruva</p>
            <p className="text-xs text-slate-500">Super Admin Console</p>
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {adminNavItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <Badge variant="outline" className={cn("ml-auto rounded-full border px-2 text-[10px]", isActive ? "border-white/20 bg-white/10 text-white" : "border-orange-200 bg-orange-50 text-orange-700")}>
                        {item.badge}
                      </Badge>
                    ) : null}
                  </>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const email = user?.email ?? "SA";
    return email.slice(0, 2).toUpperCase();
  }, [user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setGlobalQuery(params.get("query") ?? "");
  }, [location.pathname, location.search]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const handleGlobalSearch = () => {
    const nextQuery = globalQuery.trim();
    navigate(nextQuery ? `/admin/clients?query=${encodeURIComponent(nextQuery)}` : "/admin/clients");
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleGlobalSearch();
    }
  };

  const handleQuickSearch = () => {
    if (globalQuery.trim()) {
      handleGlobalSearch();
      return;
    }

    searchInputRef.current?.focus();
  };

  const handleAddClient = () => {
    navigate("/admin/clients");
    toast.message("Safe production flow: owner signs up first, then you manage the account from Clients and Subscriptions.");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,247,237,1),_rgba(248,250,252,1)_35%,_rgba(255,255,255,1)_100%)] text-slate-900">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/80 bg-white/85 px-3 py-5 shadow-xl shadow-slate-100 backdrop-blur xl:flex",
          collapsed ? "w-[96px]" : "w-[300px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[300px] border-slate-200 p-0">
          <div className="h-full p-4">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn("transition-all duration-200", collapsed ? "xl:pl-[96px]" : "xl:pl-[300px]")}>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 lg:px-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl xl:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden rounded-2xl xl:inline-flex"
                onClick={() => setCollapsed((current) => !current)}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              </Button>
            </div>

            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchInputRef}
                value={globalQuery}
                onChange={(event) => setGlobalQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search clients, invoices, tickets, outlets..."
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-11 shadow-none"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" className="hidden rounded-2xl md:inline-flex" onClick={handleQuickSearch}>
                <Command className="mr-2 h-4 w-4" />
                Quick Search
              </Button>
              <Button className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800" onClick={handleAddClient}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
              <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => navigate("/admin/notifications")}>
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 lg:flex">
                <Avatar className="h-9 w-9 rounded-2xl">
                  <AvatarFallback className="rounded-2xl bg-orange-100 font-semibold text-orange-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-slate-900">Platform Admin</p>
                  <p className="max-w-[180px] truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-2xl text-slate-500 hover:text-slate-900">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
