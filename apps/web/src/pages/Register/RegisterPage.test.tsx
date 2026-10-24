import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import { RegisterPage } from "./RegisterPage";

function mockAuth() {
  const register = vi.fn().mockResolvedValue(true);
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    session: null, ready: true, authError: "", loggingOut: false, login: vi.fn(),
    register, logout: vi.fn(), expireSession: vi.fn(), clearAuthError: vi.fn(),
  });
  return register;
}

async function fillForm(password: string, confirm: string) {
  await userEvent.type(screen.getByLabelText("Organization name"), "Acme Sons");
  await userEvent.type(screen.getByLabelText("First name"), "Ada");
  await userEvent.type(screen.getByLabelText("Last name"), "Lovelace");
  await userEvent.type(screen.getByLabelText("Email"), "ada@acme.co");
  await userEvent.type(screen.getByLabelText(/^Password/), password);
  await userEvent.type(screen.getByLabelText("Confirm password"), confirm);
}

describe("RegisterPage", () => {
  it("derives the slug from the organization name", async () => {
    mockAuth();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText("Organization name"), "Acme Sons");
    expect(screen.getByLabelText("Organization slug")).toHaveValue("acme-sons");
  });

  it("blocks submit when passwords differ", async () => {
    const register = mockAuth();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    await fillForm("correct-horse-1", "correct-horse-2");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(register).not.toHaveBeenCalled();
  });

  it("registers without sending confirmPassword", async () => {
    const register = mockAuth();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    await fillForm("correct-horse-1", "correct-horse-1");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(register).toHaveBeenCalled());
    const payload = register.mock.calls[0]![0];
    expect(payload).not.toHaveProperty("confirmPassword");
    expect(payload).toMatchObject({ tenantSlug: "acme-sons", email: "ada@acme.co" });
  });
});
