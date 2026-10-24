import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { MANAGER_ROLES } from "../../common/constants";
import type { InventoryRow, Product, Warehouse } from "../../common/types";
import { PageHeading } from "../../components/PageHeading";
import { useSession } from "../../context/AuthContext";
import { catalogService } from "../../services";
import { errorMessage } from "../../utils/errors";
import { formatCurrency } from "../../utils/format";
import "./InventoryPage.scss";

const EMPTY_WAREHOUSE = { code: "", name: "", line1: "", city: "", postalCode: "", countryCode: "" };
const EMPTY_PRODUCT = { sku: "", name: "", price: "" };
const EMPTY_STOCK = { warehouseId: "", productId: "", available: "" };

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement>;

function fieldSetter<T extends object>(setter: React.Dispatch<React.SetStateAction<T>>) {
  return (field: keyof T) => (event: InputEvent) => setter((form) => ({ ...form, [field]: event.target.value }));
}

export function InventoryPage() {
  const session = useSession();
  const allowed = MANAGER_ROLES.includes(session.user.role);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [warehouseForm, setWarehouseForm] = useState(EMPTY_WAREHOUSE);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [warehouseData, productData, inventory] = await Promise.all([
      catalogService.warehouses(), catalogService.products(), catalogService.inventory(),
    ]);
    setWarehouses(warehouseData);
    setProducts(productData);
    setRows(inventory);
    setStockForm((form) => ({
      ...form,
      warehouseId: form.warehouseId || warehouseData[0]?.id || "",
      productId: form.productId || productData[0]?.id || "",
    }));
  }, []);

  useEffect(() => {
    if (allowed) load().catch((err) => setError(errorMessage(err)));
  }, [allowed, load]);

  async function submit(event: FormEvent, action: () => Promise<unknown>, reset: () => void, success: string) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await action();
      reset();
      setMessage(success);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const warehouseField = fieldSetter(setWarehouseForm);
  const productField = fieldSetter(setProductForm);
  const stockField = fieldSetter(setStockForm);

  if (!allowed) {
    return (
      <>
        <PageHeading title="Overview" subtitle="Overview overview" />
        <section className="panel page-panel"><p className="empty-state">Inventory is managed by administrators and fulfillment managers.</p></section>
      </>
    );
  }

  return (
    <>
      <PageHeading title="Overview" subtitle="Overview overview" />
      <div className="inventory-layout">
        {error && <div className="dashboard-error page-message" role="alert">{error}</div>}
        {message && <div className="success-message page-message" role="status">{message}</div>}

        <div className="form-columns">
          <form className="panel page-panel form-stack" onSubmit={(event) => submit(event, () => catalogService.addWarehouse({
            code: warehouseForm.code, name: warehouseForm.name,
            address: { line1: warehouseForm.line1, city: warehouseForm.city, postalCode: warehouseForm.postalCode, countryCode: warehouseForm.countryCode },
          }), () => setWarehouseForm(EMPTY_WAREHOUSE), "Warehouse added.")}>
            <h2>Add warehouse</h2>
            <label>Code<input value={warehouseForm.code} onChange={warehouseField("code")} pattern="[A-Za-z0-9\-]{2,20}" title="2–20 letters, numbers or hyphens" required /></label>
            <label>Name<input value={warehouseForm.name} onChange={warehouseField("name")} required /></label>
            <label>Address<input value={warehouseForm.line1} onChange={warehouseField("line1")} required /></label>
            <div className="form-row">
              <label>City<input value={warehouseForm.city} onChange={warehouseField("city")} required /></label>
              <label>Postal code<input value={warehouseForm.postalCode} onChange={warehouseField("postalCode")} required /></label>
            </div>
            <label>Country code<input value={warehouseForm.countryCode} onChange={warehouseField("countryCode")} maxLength={2} minLength={2} placeholder="IN" required /></label>
            <button className="btn btn-primary" type="submit">Add warehouse</button>
          </form>

          <form className="panel page-panel form-stack" onSubmit={(event) => submit(event, () => catalogService.addProduct({
            sku: productForm.sku, name: productForm.name, price: Number(productForm.price),
          }), () => setProductForm(EMPTY_PRODUCT), "Product added. Set its stock below.")}>
            <h2>Add product</h2>
            <label>SKU<input value={productForm.sku} onChange={productField("sku")} required /></label>
            <label>Name<input value={productForm.name} onChange={productField("name")} required /></label>
            <label>Price ({session.tenant.defaultCurrency})<input type="number" min="0" step="0.01" value={productForm.price} onChange={productField("price")} required /></label>
            <button className="btn btn-primary" type="submit">Add product</button>
          </form>

          <form className="panel page-panel form-stack" onSubmit={(event) => submit(event, () => catalogService.setStock({
            warehouseId: stockForm.warehouseId, productId: stockForm.productId, available: Number(stockForm.available),
          }), () => setStockForm((form) => ({ ...form, available: "" })), "Stock updated.")}>
            <h2>Set stock</h2>
            <label>Warehouse<select value={stockForm.warehouseId} onChange={stockField("warehouseId")} required>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select></label>
            <label>Product<select value={stockForm.productId} onChange={stockField("productId")} required>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
            </select></label>
            <label>Units on hand<input type="number" min="0" step="1" value={stockForm.available} onChange={stockField("available")} required /></label>
            <button className="btn btn-primary" type="submit" disabled={!warehouses.length || !products.length}>Save stock</button>
          </form>
        </div>

        <section className="panel page-panel">
          <h2>Stock levels</h2>
          {rows.length === 0 ? <p className="empty-state">No stock recorded yet.</p> : (
            <table className="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>On hand</th><th>Reserved</th><th>Sellable</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.warehouseId}-${row.productId}`}>
                    <td>{row.productName}</td><td>{row.sku}</td><td>{row.warehouseName}</td>
                    <td>{row.available}</td><td>{row.reserved}</td><td>{row.available - row.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {products.length > 0 && <p className="empty-state">Catalog: {products.map((product) => `${product.name} ${formatCurrency(product.priceMinor, product.currency)}`).join(" · ")}</p>}
        </section>
      </div>
    </>
  );
}
