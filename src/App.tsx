import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import OrganizationsPage from "@/pages/OrganizationsPage";
import OrganizationDetailPage from "@/pages/OrganizationDetailPage";
import FeatureFlagsPage from "@/pages/FeatureFlagsPage";
import SubscriptionsPage from "@/pages/SubscriptionsPage";
import RevenuePage from "@/pages/RevenuePage";
import AdminsPage from "@/pages/AdminsPage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Any active admin */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="organizations/:id" element={<OrganizationDetailPage />} />
            <Route path="feature-flags" element={<FeatureFlagsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
          </Route>
        </Route>

        {/* Full-access admins only */}
        <Route element={<ProtectedRoute requiredRole="full_access" />}>
          <Route element={<AppShell />}>
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="admins" element={<AdminsPage />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
