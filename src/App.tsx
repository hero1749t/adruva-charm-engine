import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerMenu from "./pages/OwnerMenu";
import OwnerTables from "./pages/OwnerTables";
import OwnerSettings from "./pages/OwnerSettings";
import CustomerMenu from "./pages/CustomerMenu";
import KitchenDisplay from "./pages/KitchenDisplay";
import CashierDashboard from "./pages/CashierDashboard";
import OwnerAnalytics from "./pages/OwnerAnalytics";
import OwnerCustomers from "./pages/OwnerCustomers";
import OwnerStaff from "./pages/OwnerStaff";
import OwnerInventory from "./pages/OwnerInventory";
import OwnerExpenses from "./pages/OwnerExpenses";
import OwnerRooms from "./pages/OwnerRooms";
import OwnerChain from "./pages/OwnerChain";
import Install from "./pages/Install";
import RoleDashboardRedirect from "./components/RoleDashboardRedirect";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPlans from "./pages/AdminPlans";
import AdminOwners from "./pages/AdminOwners";
import AdminOwnerDetail from "./pages/AdminOwnerDetail";
import AdminGuard from "./components/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/owner/kitchen" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
              <Route path="/owner/inventory" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerInventory /></RoleGuard></ProtectedRoute>} />
              <Route path="/owner/expenses" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerExpenses /></RoleGuard></ProtectedRoute>} />
              <Route path="/owner/rooms" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerRooms /></RoleGuard></ProtectedRoute>} />
              <Route path="/owner/chain" element={<ProtectedRoute><RoleGuard check="isOwner"><OwnerChain /></RoleGuard></ProtectedRoute>} />
              <Route path="/menu/:ownerId" element={<CustomerMenu />} />
              <Route path="/install" element={<Install />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="/admin/plans" element={<AdminGuard><AdminPlans /></AdminGuard>} />
              <Route path="/admin/owners" element={<AdminGuard><AdminOwners /></AdminGuard>} />
              <Route path="/admin/owners/:ownerId" element={<AdminGuard><AdminOwnerDetail /></AdminGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
