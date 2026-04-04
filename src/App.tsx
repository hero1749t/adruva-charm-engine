import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import RoleDashboardRedirect from "./components/RoleDashboardRedirect";
import AdminGuard from "./components/AdminGuard";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const isRetryableQueryError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();
  if (message.includes("jwt") || message.includes("unauthorized") || message.includes("forbidden")) {
    return false;
  }

  return true;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false;
        }
        return isRetryableQueryError(error);
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

const Index = lazyWithRetry(() => import("./pages/Index"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const OwnerLogin = lazyWithRetry(() => import("./pages/OwnerLogin"));
const OwnerDashboard = lazyWithRetry(() => import("./pages/OwnerDashboard"));
const OwnerMenu = lazyWithRetry(() => import("./pages/OwnerMenu"));
const OwnerTables = lazyWithRetry(() => import("./pages/OwnerTables"));
const OwnerSettings = lazyWithRetry(() => import("./pages/OwnerSettings"));
const CustomerMenu = lazyWithRetry(() => import("./pages/CustomerMenu"));
const KitchenDisplay = lazyWithRetry(() => import("./pages/KitchenDisplay"));
const CashierDashboard = lazyWithRetry(() => import("./pages/CashierDashboard"));
const OwnerAnalytics = lazyWithRetry(() => import("./pages/OwnerAnalytics"));
const OwnerCustomers = lazyWithRetry(() => import("./pages/OwnerCustomers"));
const OwnerStaff = lazyWithRetry(() => import("./pages/OwnerStaff"));
const OwnerInventory = lazyWithRetry(() => import("./pages/OwnerInventory"));
const OwnerExpenses = lazyWithRetry(() => import("./pages/OwnerExpenses"));
const OwnerRooms = lazyWithRetry(() => import("./pages/OwnerRooms"));
const OwnerChain = lazyWithRetry(() => import("./pages/OwnerChain"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AdminPlans = lazyWithRetry(() => import("./pages/AdminPlans"));
const AdminOwners = lazyWithRetry(() => import("./pages/AdminOwners"));
const AdminOwnerDetail = lazyWithRetry(() => import("./pages/AdminOwnerDetail"));
const AdminOutlets = lazyWithRetry(() => import("./pages/AdminOutlets"));
const AdminPayments = lazyWithRetry(() => import("./pages/AdminPayments"));
const AdminOnboarding = lazyWithRetry(() => import("./pages/AdminOnboarding"));
const AdminSupport = lazyWithRetry(() => import("./pages/AdminSupport"));
const AdminUsers = lazyWithRetry(() => import("./pages/AdminUsers"));
const AdminModules = lazyWithRetry(() => import("./pages/AdminModules"));
const AdminTemplates = lazyWithRetry(() => import("./pages/AdminTemplates"));
const AdminIntegrations = lazyWithRetry(() => import("./pages/AdminIntegrations"));
const AdminNotifications = lazyWithRetry(() => import("./pages/AdminNotifications"));
const AdminReports = lazyWithRetry(() => import("./pages/AdminReports"));
const AdminActivity = lazyWithRetry(() => import("./pages/AdminActivity"));
const AdminSystemSettings = lazyWithRetry(() => import("./pages/AdminSystemSettings"));
const AdminProfile = lazyWithRetry(() => import("./pages/AdminProfile"));

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const warmRoutes = (routes: Array<() => Promise<unknown>>) => {
  routes.forEach((route) => {
    void route().catch(() => undefined);
  });
};

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

const RoutePrefetcher = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const schedulePrefetch = () => {
      const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
      if (connection?.saveData || connection?.effectiveType?.includes("2g")) {
        return;
      }

      if (location.pathname === "/") {
        warmRoutes([OwnerLogin.preload, AdminLogin.preload, Install.preload]);
        return;
      }

      if (location.pathname.startsWith("/owner")) {
        const ownerCoreRoutes = [
          OwnerDashboard.preload,
          CashierDashboard.preload,
          OwnerMenu.preload,
          OwnerTables.preload,
          KitchenDisplay.preload,
        ];
        const ownerExtendedRoutes = [
          OwnerAnalytics.preload,
          OwnerCustomers.preload,
          OwnerStaff.preload,
          OwnerInventory.preload,
          OwnerExpenses.preload,
          OwnerRooms.preload,
          OwnerChain.preload,
          OwnerSettings.preload,
        ];

        warmRoutes(user ? [...ownerCoreRoutes, ...ownerExtendedRoutes] : ownerCoreRoutes);
        return;
      }

      if (location.pathname.startsWith("/admin")) {
        if (location.pathname === "/admin/login") {
          warmRoutes([AdminDashboard.preload, AdminOwners.preload]);
          return;
        }

        if (location.pathname === "/admin/dashboard") {
          warmRoutes([
            AdminOwners.preload,
            AdminPlans.preload,
            AdminOnboarding.preload,
            AdminNotifications.preload,
          ]);
          return;
        }

        if (location.pathname.startsWith("/admin/clients")) {
          warmRoutes([AdminOwnerDetail.preload, AdminPlans.preload, AdminPayments.preload]);
          return;
        }

        if (location.pathname.startsWith("/admin/subscriptions") || location.pathname.startsWith("/admin/plans")) {
          warmRoutes([AdminOwners.preload, AdminPayments.preload]);
          return;
        }

        if (location.pathname.startsWith("/admin/payments")) {
          warmRoutes([AdminDashboard.preload, AdminNotifications.preload]);
          return;
        }

        if (location.pathname.startsWith("/admin/support")) {
          warmRoutes([AdminNotifications.preload, AdminActivity.preload]);
          return;
        }

        if (location.pathname.startsWith("/admin/reports")) {
          warmRoutes([AdminDashboard.preload, AdminActivity.preload]);
          return;
        }

        warmRoutes([AdminDashboard.preload, AdminOwners.preload, AdminPlans.preload]);
        return;
      }

      if (location.pathname.startsWith("/menu/")) {
        warmRoutes([CustomerMenu.preload]);
      }
    };

    const idleCallback = window.requestIdleCallback;
    if (idleCallback) {
      const idleId = idleCallback(schedulePrefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(schedulePrefetch, 600);
    return () => window.clearTimeout(timeoutId);
  }, [loading, location.pathname, user]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RoutePrefetcher />
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/owner/login" element={<OwnerLogin />} />
                <Route path="/owner" element={<ProtectedRoute><RoleDashboardRedirect /></ProtectedRoute>} />
                <Route path="/owner/dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
                <Route path="/owner/cashier" element={<ProtectedRoute><CashierDashboard /></ProtectedRoute>} />
                <Route path="/owner/menu" element={<ProtectedRoute><RoleGuard check="canManageMenu"><OwnerMenu /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/analytics" element={<ProtectedRoute><RoleGuard check="canViewAnalytics"><OwnerAnalytics /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/tables" element={<ProtectedRoute><OwnerTables /></ProtectedRoute>} />
                <Route path="/owner/settings" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerSettings /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/customers" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerCustomers /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/staff" element={<ProtectedRoute><RoleGuard check="canManageStaff"><OwnerStaff /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/kitchen" element={<ProtectedRoute><RoleGuard check="canWorkKitchen"><KitchenDisplay /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/inventory" element={<ProtectedRoute><RoleGuard check="canManageBusiness"><OwnerInventory /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/expenses" element={<ProtectedRoute><RoleGuard check="canManageBusiness"><OwnerExpenses /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/rooms" element={<ProtectedRoute><RoleGuard check="canManageBusiness"><OwnerRooms /></RoleGuard></ProtectedRoute>} />
                <Route path="/owner/chain" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerChain /></RoleGuard></ProtectedRoute>} />
                <Route path="/menu/:ownerId" element={<CustomerMenu />} />
                <Route path="/install" element={<Install />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                <Route path="/admin/clients" element={<AdminGuard><AdminOwners /></AdminGuard>} />
                <Route path="/admin/outlets" element={<AdminGuard><AdminOutlets /></AdminGuard>} />
                <Route path="/admin/plans" element={<AdminGuard><AdminPlans /></AdminGuard>} />
                <Route path="/admin/subscriptions" element={<AdminGuard><AdminPlans /></AdminGuard>} />
                <Route path="/admin/payments" element={<AdminGuard><AdminPayments /></AdminGuard>} />
                <Route path="/admin/onboarding" element={<AdminGuard><AdminOnboarding /></AdminGuard>} />
                <Route path="/admin/support" element={<AdminGuard><AdminSupport /></AdminGuard>} />
                <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                <Route path="/admin/modules" element={<AdminGuard><AdminModules /></AdminGuard>} />
                <Route path="/admin/templates" element={<AdminGuard><AdminTemplates /></AdminGuard>} />
                <Route path="/admin/integrations" element={<AdminGuard><AdminIntegrations /></AdminGuard>} />
                <Route path="/admin/notifications" element={<AdminGuard><AdminNotifications /></AdminGuard>} />
                <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
                <Route path="/admin/activity" element={<AdminGuard><AdminActivity /></AdminGuard>} />
                <Route path="/admin/system-settings" element={<AdminGuard><AdminSystemSettings /></AdminGuard>} />
                <Route path="/admin/profile" element={<AdminGuard><AdminProfile /></AdminGuard>} />
                <Route path="/admin/owners" element={<AdminGuard><AdminOwners /></AdminGuard>} />
                <Route path="/admin/clients/:ownerId" element={<AdminGuard><AdminOwnerDetail /></AdminGuard>} />
                <Route path="/admin/owners/:ownerId" element={<AdminGuard><AdminOwnerDetail /></AdminGuard>} />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
