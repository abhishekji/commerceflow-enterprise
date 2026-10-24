import { Outlet } from "react-router-dom";
import { Notice } from "../../components/Notice";
import { Sidebar } from "../../components/Sidebar";
import { Topbar } from "../../components/Topbar";
import "./AppLayout.scss";

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar />
        <div className="page-content">
          <Notice />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
