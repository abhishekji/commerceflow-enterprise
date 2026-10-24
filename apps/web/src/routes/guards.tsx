import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../common/constants";
import { LoadingScreen } from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";

export interface RedirectState {
  from?: string;
}

export function ProtectedRoute() {
  const { session, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingScreen />;
  if (!session) {
    const state: RedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to={ROUTES.LOGIN} replace state={state} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingScreen />;
  if (session) {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from && from !== ROUTES.LOGIN ? from : ROUTES.DASHBOARD} replace />;
  }
  return <Outlet />;
}
