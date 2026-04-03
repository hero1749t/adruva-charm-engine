export type DashboardThemeKey = "default" | "midnight" | "sunset" | "forest" | "slate";

export type DashboardThemePreset = {
  key: DashboardThemeKey;
  name: string;
  description: string;
  shellClass: string;
  headerClass: string;
  sidebarClass: string;
  navActiveClass: string;
  navInactiveClass: string;
  supportLinkClass: string;
  logoBadgeClass: string;
};

export const DASHBOARD_THEME_STORAGE_PREFIX = "owner-dashboard-theme";

export const dashboardThemePresets: Record<DashboardThemeKey, DashboardThemePreset> = {
  default: {
    key: "default",
    name: "Default",
    description: "Clean orange and neutral layout",
    shellClass: "bg-background",
    headerClass: "bg-card text-foreground border-border",
    sidebarClass: "bg-card border-border",
    navActiveClass: "bg-primary text-primary-foreground",
    navInactiveClass: "text-muted-foreground hover:bg-accent hover:text-foreground",
    supportLinkClass: "text-muted-foreground hover:bg-accent",
    logoBadgeClass: "bg-primary/10 text-primary",
  },
  midnight: {
    key: "midnight",
    name: "Midnight Pro",
    description: "Dark navy shell with crisp highlights",
    shellClass: "bg-slate-950",
    headerClass: "bg-slate-900 text-slate-50 border-slate-800",
    sidebarClass: "bg-slate-900 border-slate-800",
    navActiveClass: "bg-orange-500 text-white",
    navInactiveClass: "text-slate-300 hover:bg-slate-800 hover:text-white",
    supportLinkClass: "text-slate-300 hover:bg-slate-800",
    logoBadgeClass: "bg-orange-500/15 text-orange-300",
  },
  sunset: {
    key: "sunset",
    name: "Sunset Warm",
    description: "Soft cream panels with warm orange accents",
    shellClass: "bg-orange-50",
    headerClass: "bg-white text-slate-900 border-orange-100",
    sidebarClass: "bg-orange-100/70 border-orange-100",
    navActiveClass: "bg-orange-500 text-white",
    navInactiveClass: "text-slate-700 hover:bg-white hover:text-slate-950",
    supportLinkClass: "text-slate-700 hover:bg-white",
    logoBadgeClass: "bg-orange-500/15 text-orange-700",
  },
  forest: {
    key: "forest",
    name: "Forest Calm",
    description: "Fresh green tones for a premium cafe feel",
    shellClass: "bg-emerald-50",
    headerClass: "bg-emerald-900 text-emerald-50 border-emerald-800",
    sidebarClass: "bg-white border-emerald-100",
    navActiveClass: "bg-emerald-600 text-white",
    navInactiveClass: "text-emerald-900/80 hover:bg-emerald-100 hover:text-emerald-950",
    supportLinkClass: "text-emerald-900/80 hover:bg-emerald-100",
    logoBadgeClass: "bg-emerald-600/15 text-emerald-700",
  },
  slate: {
    key: "slate",
    name: "Slate Modern",
    description: "Muted grey-blue admin style with strong contrast",
    shellClass: "bg-slate-100",
    headerClass: "bg-slate-800 text-slate-50 border-slate-700",
    sidebarClass: "bg-white border-slate-200",
    navActiveClass: "bg-slate-800 text-white",
    navInactiveClass: "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
    supportLinkClass: "text-slate-700 hover:bg-slate-100",
    logoBadgeClass: "bg-slate-800/10 text-slate-700",
  },
};

export const getDashboardThemeStorageKey = (ownerId: string) =>
  `${DASHBOARD_THEME_STORAGE_PREFIX}:${ownerId}`;

