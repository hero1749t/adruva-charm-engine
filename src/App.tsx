import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerMenu from "./pages/OwnerMenu";
import OwnerTables from "./pages/OwnerTables";
import OwnerSettings from "./pages/OwnerSettings";
import CustomerMenu from "./pages/CustomerMenu";
import KitchenDisplay from "./pages/KitchenDisplay";
import OwnerAnalytics from "./pages/OwnerAnalytics";
import OwnerLeads from "./pages/OwnerLeads";
import Install from "./pages/Install";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/owner/dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner/menu" element={<ProtectedRoute><OwnerMenu /></ProtectedRoute>} />
            <Route path="/owner/analytics" element={<ProtectedRoute><OwnerAnalytics /></ProtectedRoute>} />
            <Route path="/owner/tables" element={<ProtectedRoute><OwnerTables /></ProtectedRoute>} />
            <Route path="/owner/settings" element={<ProtectedRoute><OwnerSettings /></ProtectedRoute>} />
            <Route path="/menu/:ownerId" element={<CustomerMenu />} />
            <Route path="/owner/kitchen" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
