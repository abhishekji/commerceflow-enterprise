import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import { LoginPage } from "./LoginPage";

function mockAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  const login = vi.fn().mockResolvedValue(true);
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    session: null, ready: true, authError: "", loggingOut: false, login,
    register: vi.fn(), logout: vi.fn(), expireSession: vi.fn(), clearAuthError: vi.fn(), ...overrides,
  });
  return login;
}

describe("LoginPage", () => {
  it("submits the entered credentials", async () => {
    const login = mockAuth();
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText("Organization slug"), "acme");
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "secret-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ tenantSlug: "acme", email: "a@b.co", password: "secret-password" }));
  });

  it("shows the auth error and links to registration", () => {
    mockAuth({ authError: "The organization, email, or password is incorrect." });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("incorrect");
    expect(screen.getByRole("link", { name: /Create an account/ })).toHaveAttribute("href", "/register");
  });
});
