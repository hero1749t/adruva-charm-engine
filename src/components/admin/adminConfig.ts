import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  FileText,
  Gauge,
  LayoutTemplate,
  LifeBuoy,
  Package2,
  Puzzle,
  ReceiptText,
  Rocket,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export const adminNavItems: AdminNavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/outlets", label: "Outlets / Branches", icon: Building2 },
  { to: "/admin/subscriptions", label: "Subscriptions & Plans", icon: WalletCards },
  { to: "/admin/payments", label: "Payments & Invoices", icon: CreditCard },
  { to: "/admin/onboarding", label: "Onboarding", icon: Rocket },
  { to: "/admin/support", label: "Support Tickets", icon: LifeBuoy },
  { to: "/admin/users", label: "Users & Roles", icon: UserCog },
  { to: "/admin/modules", label: "Feature Access / Modules", icon: ShieldCheck },
  { to: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/admin/integrations", label: "Integrations", icon: Puzzle },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/reports", label: "Reports & Analytics", icon: Package2 },
  { to: "/admin/activity", label: "Activity Logs", icon: Activity },
  { to: "/admin/system-settings", label: "System Settings", icon: Settings2 },
  { to: "/admin/profile", label: "Profile", icon: ScrollText },
];
