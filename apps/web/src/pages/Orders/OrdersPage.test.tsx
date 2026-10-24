import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatus, PaymentStatus, UserRole } from "../../common/enums";
import type { Order } from "../../common/types";
import * as AuthContext from "../../context/AuthContext";
import { orderService } from "../../services";
import { OrdersPage } from "./OrdersPage";

vi.mock("../../services", () => ({ orderService: { list: vi.fn(), transition: vi.fn() } }));

const baseOrder: Order = {
  id: "65a1b2c3d4e5f60718293a4b", status: OrderStatus.Pending, paymentStatus: PaymentStatus.Unpaid,
  paymentMethod: null, paymentReference: null, paymentSummary: null, paidAt: null,
  totalMinor: 2500, currency: "USD", warehouseId: "w", customerId: "c", customerName: "Cust",
  createdAt: "2026-01-01T00:00:00Z", shipment: null,
  items: [{ productId: "p", sku: "S", name: "Widget", quantity: 2, unitPriceMinor: 1250 }],
};

function mockRole(role: UserRole) {
  vi.spyOn(AuthContext, "useSession").mockReturnValue({
    user: { id: "u", firstName: "A", lastName: "B", role },
    tenant: { id: "t", name: "Acme", defaultCurrency: "USD", timeZone: "UTC" },
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/orders"]}>
      <Routes>
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId/pay" element={<p>payment screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OrdersPage", () => {
  beforeEach(() => vi.mocked(orderService.list).mockResolvedValue([baseOrder]));

  it("lets customers pay an unpaid order via the payment route", async () => {
    mockRole(UserRole.Customer);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Pay now" }));
    expect(await screen.findByText("payment screen")).toBeInTheDocument();
  });

  it("hides Confirm for unpaid orders for staff but keeps Cancel", async () => {
    mockRole(UserRole.TenantAdmin);
    renderPage();
    expect(await screen.findByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pay now" })).toBeNull();
  });

  it("shows Confirm once the order is paid", async () => {
    mockRole(UserRole.TenantAdmin);
    vi.mocked(orderService.list).mockResolvedValue([{ ...baseOrder, paymentStatus: PaymentStatus.Paid }]);
    renderPage();
    expect(await screen.findByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});
