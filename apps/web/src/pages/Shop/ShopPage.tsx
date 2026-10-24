import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAX_LINE_QUANTITY, orderPayPath } from "../../common/constants";
import type { Product, Warehouse } from "../../common/types";
import { PageHeading } from "../../components/PageHeading";
import { OutOfStockBadge } from "../../components/StatusBadge";
import { catalogService, orderService } from "../../services";
import { errorMessage } from "../../utils/errors";
import { formatCurrency } from "../../utils/format";
import "./ShopPage.scss";

export function ShopPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    catalogService.warehouses()
      .then((data) => {
        setWarehouses(data);
        if (data.length) setWarehouseId(data[0]!.id);
      })
      .catch((err) => { setWarehouses([]); setError(errorMessage(err)); });
  }, []);

  useEffect(() => {
    if (!warehouseId) return;
    setCart({});
    catalogService.products(warehouseId).then(setProducts).catch((err) => setError(errorMessage(err)));
  }, [warehouseId]);

  const lines = useMemo(
    () => products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id]! })),
    [products, cart],
  );
  const currencies = new Set(lines.map((line) => line.product.currency));
  const totalMinor = lines.reduce((sum, line) => sum + line.product.priceMinor * line.quantity, 0);

  function addToCart(product: Product) {
    const wanted = Math.max(1, Number(quantities[product.id] || 1));
    const next = Math.min(product.sellable, (cart[product.id] || 0) + wanted, MAX_LINE_QUANTITY);
    setCart((current) => ({ ...current, [product.id]: next }));
  }

  function removeFromCart(productId: string) {
    setCart((current) => {
      const { [productId]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function placeOrder() {
    setPlacing(true);
    setError("");
    try {
      const order = await orderService.place({
        warehouseId,
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      });
      navigate(orderPayPath(order.id));
    } catch (err) {
      setError(errorMessage(err));
      setPlacing(false);
    }
  }

  if (warehouses === null) return <p role="status">Loading catalog…</p>;
  if (!warehouses.length) {
    return (
      <>
        <PageHeading title="Browse Products" subtitle="Browse Products overview" />
        <section className="panel page-panel"><p className="empty-state">No warehouses exist yet. An administrator can add warehouses, products and stock under Inventory → Overview.</p></section>
      </>
    );
  }

  return (
    <>
      <PageHeading title="Browse Products" subtitle="Browse Products overview" />
      <div className="shop-layout">
        <section className="panel page-panel">
          <div className="panel-toolbar">
            <h2>Products</h2>
            <label className="inline-field">Ship from
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
              </select>
            </label>
          </div>
          {error && <div className="dashboard-error page-message" role="alert">{error}</div>}
          {products.length === 0 ? <p className="empty-state">No products are available yet.</p> : (
            <table className="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>In stock</th><th /></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{formatCurrency(product.priceMinor, product.currency)}</td>
                    <td>{product.sellable > 0 ? product.sellable : <OutOfStockBadge />}</td>
                    <td className="row-actions">
                      <input type="number" min="1" max={Math.max(1, product.sellable)} value={quantities[product.id] || 1} aria-label={`Quantity for ${product.name}`}
                        onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))} />
                      <button className="btn" disabled={product.sellable < 1 || (cart[product.id] || 0) >= product.sellable} onClick={() => addToCart(product)}>Add to cart</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className="panel page-panel cart-panel">
          <h2>Cart</h2>
          {lines.length === 0 ? <p className="empty-state">Your cart is empty.</p> : (
            <>
              <ul className="cart-list">
                {lines.map(({ product, quantity }) => (
                  <li key={product.id}>
                    <span>{product.name} × {quantity}</span>
                    <strong>{formatCurrency(product.priceMinor * quantity, product.currency)}</strong>
                    <button className="link-inline" onClick={() => removeFromCart(product.id)} aria-label={`Remove ${product.name}`}>Remove</button>
                  </li>
                ))}
              </ul>
              {currencies.size > 1
                ? <p className="dashboard-error page-message">Items use different currencies and can't be ordered together.</p>
                : <p className="cart-total">Total <strong>{formatCurrency(totalMinor, [...currencies][0]!)}</strong></p>}
              <button className="btn btn-primary" disabled={placing || currencies.size !== 1} onClick={placeOrder}>{placing ? "Placing order…" : "Place order"}</button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
