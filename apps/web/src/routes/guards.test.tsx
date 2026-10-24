import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as AuthContext from "../context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./guards";

const session = {
  user: { id: "u", firstName: "A", lastName: "B", role: "STAFF" },
  tenant: { id: "t", name: "Acme", defaultCurrency: "USD", timeZone: "UTC" },
};

function mockAuth(value: { session: unknown; ready: boolean }) {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue(value as never);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicOnlyRoute />}><Route path="/login" element={<p>login page</p>} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<p>dashboard page</p>} />
          <Route path="/orders" element={<p>orders page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("route guards", () => {
  it("shows a loading state until the session check completes", () => {
    mockAuth({ session: null, ready: false });
    renderAt("/dashboard");
    expect(screen.getByRole("status")).toHaveTextContent("Connecting");
  });

  it("redirects anonymous users to /login", () => {
    mockAuth({ session: null, ready: true });
    renderAt("/orders");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders protected pages for signed-in users", () => {
    mockAuth({ session, ready: true });
    renderAt("/orders");
    expect(screen.getByText("orders page")).toBeInTheDocument();
  });

  it("sends signed-in users away from /login", () => {
    mockAuth({ session, ready: true });
    renderAt("/login");
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });
});
