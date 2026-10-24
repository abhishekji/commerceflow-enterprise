import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatus, PaymentStatus } from "../../common/enums";
import type { Order } from "../../common/types";
import { NoticeProvider } from "../../context/NoticeContext";
import { orderService } from "../../services";
import { ApiError } from "../../utils/apiClient";
import { PaymentPage } from "./PaymentPage";

vi.mock("../../services", () => ({
  orderService: { get: vi.fn(), transition: vi.fn() },
  paymentService: { pay: vi.fn() },
}));

const order: Order = {
  id: "65a1b2c3d4e5f60718293a4b", status: OrderStatus.Pending, paymentStatus: PaymentStatus.Unpaid,
  paymentMethod: null, paymentReference: null, paymentSummary: null, paidAt: null,
  totalMinor: 2500, currency: "USD", warehouseId: "w", customerId: "c", customerName: "Cust",
  createdAt: "2026-01-01T00:00:00Z", shipment: null,
  items: [{ productId: "p", sku: "S", name: "Widget", quantity: 2, unitPriceMinor: 1250 }],
};

function renderPage() {
  return render(
    <NoticeProvider>
      <MemoryRouter initialEntries={["/orders/65a1b2c3d4e5f60718293a4b/pay"]}>
        <Routes>
          <Route path="/orders/:orderId/pay" element={<PaymentPage />} />
          <Route path="/orders" element={<p>orders screen</p>} />
          <Route path="/shop" element={<p>shop screen</p>} />
        </Routes>
      </MemoryRouter>
    </NoticeProvider>,
  );
}

describe("PaymentPage", () => {
  beforeEach(() => vi.mocked(orderService.get).mockResolvedValue(order));

  it("loads the order from the route and offers payment", async () => {
    renderPage();
    expect(await screen.findByText(/Payment · Order #293A4B/)).toBeInTheDocument();
    expect(orderService.get).toHaveBeenCalledWith("65a1b2c3d4e5f60718293a4b");
  });

  it("goes back to orders on Pay later", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Pay later" }));
    expect(await screen.findByText("orders screen")).toBeInTheDocument();
  });

  it("cancels the order and returns to the shop", async () => {
    vi.mocked(orderService.transition).mockResolvedValue({ ...order, status: OrderStatus.Cancelled });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Cancel order" }));
    expect(orderService.transition).toHaveBeenCalledWith(order.id, OrderStatus.Cancelled);
    expect(await screen.findByText("shop screen")).toBeInTheDocument();
  });

  it("shows an error when the order cannot be loaded", async () => {
    orderService.get = (async () => { throw new ApiError(404, "ORDER_NOT_FOUND"); }) as typeof orderService.get;
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Order not found.");
  });
});
