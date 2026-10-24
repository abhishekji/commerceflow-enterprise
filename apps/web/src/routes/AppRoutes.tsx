import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { COMING_SOON_LINKS, ROUTES } from "../common/constants";
import { LoadingScreen } from "../components/LoadingScreen";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./guards";

const LoginPage = lazy(() => import("../pages/Login").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("../pages/Register").then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("../pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const ShopPage = lazy(() => import("../pages/Shop").then((m) => ({ default: m.ShopPage })));
const OrdersPage = lazy(() => import("../pages/Orders").then((m) => ({ default: m.OrdersPage })));
const PaymentPage = lazy(() => import("../pages/Payment").then((m) => ({ default: m.PaymentPage })));
const InventoryPage = lazy(() => import("../pages/Inventory").then((m) => ({ default: m.InventoryPage })));
const ComingSoonPage = lazy(() => import("../pages/ComingSoon").then((m) => ({ default: m.ComingSoonPage })));
const NotFoundPage = lazy(() => import("../pages/NotFound").then((m) => ({ default: m.NotFoundPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading…" />}>
      <Routes>
        <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.SHOP} element={<ShopPage />} />
            <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
            <Route path={ROUTES.ORDER_PAY} element={<PaymentPage />} />
            <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
            {COMING_SOON_LINKS.map((link) => (
              <Route key={link.path} path={link.path} element={<ComingSoonPage title={link.label} />} />
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
