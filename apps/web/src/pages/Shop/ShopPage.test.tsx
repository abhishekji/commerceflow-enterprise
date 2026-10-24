import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatus, PaymentStatus } from "../../common/enums";
import type { Order } from "../../common/types";
import { catalogService, orderService } from "../../services";
import { ShopPage } from "./ShopPage";

vi.mock("../../services", () => ({
  catalogService: { warehouses: vi.fn(), products: vi.fn() },
  orderService: { place: vi.fn() },
}));

describe("ShopPage", () => {
  beforeEach(() => {
    vi.mocked(catalogService.warehouses).mockResolvedValue([{ id: "w1", name: "Main", code: "MN" }]);
    vi.mocked(catalogService.products).mockResolvedValue([
      { id: "p1", sku: "SKU1", name: "Widget", priceMinor: 1000, currency: "USD", sellable: 5 },
      { id: "p2", sku: "SKU2", name: "Gadget", priceMinor: 500, currency: "USD", sellable: 0 },
    ]);
  });

  it("adds to the cart and navigates to the payment page after placing an order", async () => {
    vi.mocked(orderService.place).mockResolvedValue({
      id: "order123", status: OrderStatus.Pending, paymentStatus: PaymentStatus.Unpaid,
    } as Order);
    render(
      <MemoryRouter initialEntries={["/shop"]}>
        <Routes>
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/orders/:orderId/pay" element={<p>payment screen</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click((await screen.findAllByText("Add to cart"))[0]!);
    expect(screen.getByText("Widget × 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));

    expect(orderService.place).toHaveBeenCalledWith({ warehouseId: "w1", items: [{ productId: "p1", quantity: 1 }] });
    expect(await screen.findByText("payment screen")).toBeInTheDocument();
  });

  it("marks out-of-stock products and disables adding them", async () => {
    render(<MemoryRouter><ShopPage /></MemoryRouter>);
    expect(await screen.findByText("Out of stock")).toBeInTheDocument();
    expect(screen.getAllByText("Add to cart")[1]).toBeDisabled();
  });
});
