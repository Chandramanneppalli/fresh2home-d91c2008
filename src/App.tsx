import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AppShell from "@/components/AppShell";
import ProtectedRoute from "@/components/ProtectedRoute";

import Welcome from "./pages/Welcome";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";
import NotFound from "./pages/NotFound";

import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerProducts from "./pages/farmer/FarmerProducts";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerClimate from "./pages/farmer/FarmerClimate";
import FarmerPricing from "./pages/farmer/FarmerPricing";
import FarmerQualityScan from "./pages/farmer/FarmerQualityScan";

import ConsumerHome from "./pages/consumer/ConsumerHome";
import ProductDetail from "./pages/consumer/ProductDetail";
import ConsumerCart from "./pages/consumer/ConsumerCart";
import ConsumerOrders from "./pages/consumer/ConsumerOrders";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminSettings from "./pages/admin/AdminSettings";

import ChatPage from "./pages/shared/ChatPage";
import ProfilePage from "./pages/shared/ProfilePage";
import TraceLot from "./pages/TraceLot";

const queryClient = new QueryClient();

// Redirect authenticated users away from auth pages
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, role, loading } = useApp();
  if (loading) return null;
  if (isAuthenticated && role) {
    const dest = role === 'farmer' ? '/farmer' : role === 'admin' ? '/admin' : '/consumer';
    return <Navigate to={dest} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/" element={<AuthRoute><Welcome /></AuthRoute>} />
            <Route path="/role-select" element={<AuthRoute><RoleSelect /></AuthRoute>} />
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
            <Route path="/verify-otp" element={<AuthRoute><VerifyOtp /></AuthRoute>} />

            {/* Farmer */}
            <Route path="/farmer" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><FarmerDashboard /></AppShell></ProtectedRoute>} />
            <Route path="/farmer/products" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><FarmerProducts /></AppShell></ProtectedRoute>} />
            <Route path="/farmer/orders" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><FarmerOrders /></AppShell></ProtectedRoute>} />
            <Route path="/farmer/climate" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><FarmerClimate /></AppShell></ProtectedRoute>} />
            <Route path="/farmer/pricing" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><FarmerPricing /></AppShell></ProtectedRoute>} />
            <Route path="/farmer/chat" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><ChatPage /></AppShell></ProtectedRoute>} />
            <Route path="/farmer/scan" element={<ProtectedRoute allowedRoles={['farmer']}><AppShell><FarmerQualityScan /></AppShell></ProtectedRoute>} />

            {/* Consumer */}
            <Route path="/consumer" element={<ProtectedRoute allowedRoles={['consumer']}><AppShell><ConsumerHome /></AppShell></ProtectedRoute>} />
            <Route path="/consumer/browse" element={<ProtectedRoute allowedRoles={['consumer']}><AppShell><ConsumerHome /></AppShell></ProtectedRoute>} />
            <Route path="/consumer/product/:id" element={<ProtectedRoute allowedRoles={['consumer']}><AppShell><ProductDetail /></AppShell></ProtectedRoute>} />
            <Route path="/consumer/cart" element={<ProtectedRoute allowedRoles={['consumer']}><AppShell><ConsumerCart /></AppShell></ProtectedRoute>} />
            <Route path="/consumer/orders" element={<ProtectedRoute allowedRoles={['consumer']}><AppShell><ConsumerOrders /></AppShell></ProtectedRoute>} />
            <Route path="/consumer/chat" element={<ProtectedRoute allowedRoles={['consumer']}><AppShell><ChatPage /></AppShell></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppShell><AdminDashboard /></AppShell></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AppShell><AdminUsers /></AppShell></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute allowedRoles={['admin']}><AppShell><AdminRevenue /></AppShell></ProtectedRoute>} />
            <Route path="/admin/disputes" element={<ProtectedRoute allowedRoles={['admin']}><AppShell><AdminDisputes /></AppShell></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AppShell><AdminSettings /></AppShell></ProtectedRoute>} />

            {/* Traceability */}
            <Route path="/trace/:lotId" element={<TraceLot />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </LanguageProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
