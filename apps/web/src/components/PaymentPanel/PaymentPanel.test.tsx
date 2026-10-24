import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatus, PaymentMethod, PaymentStatus } from "../../common/enums";
import type { Order } from "../../common/types";
import { ApiError } from "../../utils/apiClient";
import { paymentService } from "../../services";
import { PaymentPanel } from "./PaymentPanel";

vi.mock("../../services", () => ({ paymentService: { pay: vi.fn() } }));

const order: Order = {
  id: "65a1b2c3d4e5f60718293a4b", status: OrderStatus.Pending, paymentStatus: PaymentStatus.Unpaid,
  paymentMethod: null, paymentReference: null, paymentSummary: null, paidAt: null,
  totalMinor: 2500, currency: "USD", warehouseId: "w", customerId: "c", customerName: "Cust",
  createdAt: "2026-01-01T00:00:00Z", shipment: null,
  items: [{ productId: "p", sku: "S", name: "Widget", quantity: 2, unitPriceMinor: 1250 }],
};

describe("PaymentPanel", () => {
  beforeEach(() => { paymentService.pay = vi.fn(); });

  it("submits a card payment and shows the receipt", async () => {
    vi.mocked(paymentService.pay).mockResolvedValue({
      reference: "PAY-1",
      order: { ...order, paymentStatus: PaymentStatus.Paid, paymentSummary: "Visa •••• 4242" },
    });
    const onPaid = vi.fn();
    render(<PaymentPanel order={order} onPaid={onPaid} onLater={() => {}} />);

    await userEvent.type(screen.getByLabelText("Name on card"), "Ada");
    await userEvent.type(screen.getByLabelText("Card number"), "4242424242424242");
    await userEvent.type(screen.getByLabelText(/Expiry/), "1230");
    await userEvent.type(screen.getByLabelText("CVV"), "123");
    await userEvent.click(screen.getByRole("button", { name: /^Pay \$/ }));

    expect(paymentService.pay).toHaveBeenCalledWith(order.id, expect.objectContaining({
      method: PaymentMethod.Card, cardNumber: "4242 4242 4242 4242", expiry: "12/30",
    }));
    expect(await screen.findByText("Payment successful.")).toBeInTheDocument();
    expect(screen.getByText("PAY-1")).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalled();
  });

  it("shows a friendly error when the payment is declined", async () => {
    paymentService.pay = (async () => { throw new ApiError(402, "PAYMENT_DECLINED"); }) as typeof paymentService.pay;
    render(<PaymentPanel order={order} onLater={() => {}} />);
    await userEvent.click(screen.getByLabelText("Pay on delivery"));
    await userEvent.click(screen.getByRole("button", { name: "Confirm order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The payment was declined");
  });

  it("offers cancel only when a handler is provided", async () => {
    const onCancel = vi.fn();
    const { rerender } = render(<PaymentPanel order={order} onLater={() => {}} />);
    expect(screen.queryByText("Cancel order")).toBeNull();
    rerender(<PaymentPanel order={order} onLater={() => {}} onCancelOrder={onCancel} />);
    await userEvent.click(screen.getByText("Cancel order"));
    expect(onCancel).toHaveBeenCalled();
  });
});
