import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "../../common/enums";
import * as AuthContext from "../../context/AuthContext";
import { catalogService } from "../../services";
import { InventoryPage } from "./InventoryPage";

vi.mock("../../services", () => ({
  catalogService: { warehouses: vi.fn(), products: vi.fn(), inventory: vi.fn() },
}));

function mockRole(role: UserRole) {
  vi.spyOn(AuthContext, "useSession").mockReturnValue({
    user: { id: "u", firstName: "A", lastName: "B", role },
    tenant: { id: "t", name: "Acme", defaultCurrency: "USD", timeZone: "UTC" },
  });
}

describe("InventoryPage", () => {
  it("blocks customers", () => {
    mockRole(UserRole.Customer);
    render(<InventoryPage />);
    expect(screen.getByText(/managed by administrators/)).toBeInTheDocument();
    expect(catalogService.warehouses).not.toHaveBeenCalled();
  });

  it("shows stock levels for managers", async () => {
    mockRole(UserRole.TenantAdmin);
    vi.mocked(catalogService.warehouses).mockResolvedValue([{ id: "w", name: "Main", code: "MN" }]);
    vi.mocked(catalogService.products).mockResolvedValue([]);
    vi.mocked(catalogService.inventory).mockResolvedValue([
      { warehouseId: "w", productId: "p", productName: "Widget", sku: "S1", warehouseName: "Main", available: 10, reserved: 3 },
    ]);
    render(<InventoryPage />);
    expect(await screen.findByText("Widget")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
