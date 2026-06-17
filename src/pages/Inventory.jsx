// ============================================================
//  Inventory: products grouped by category, with total stock,
//  cost and selling price. Buttons to add products, restock,
//  transfer, and manage categories. Click a product's stock to
//  see the warehouse-vs-branch breakdown.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import AddProductModal from './inventory/AddProductModal';
import EditProductModal from './inventory/EditProductModal';
import RestockModal from './inventory/RestockModal';
import TransferModal from './inventory/TransferModal';
import CategoriesModal from './inventory/CategoriesModal';

export default function Inventory() {
  const { activeId } = useCompany();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // which popup is open
  const [modal, setModal] = useState(null);       // 'add' | 'restock' | 'transfer' | 'categories'
  const [editing, setEditing] = useState(null);   // product being edited
  const [stockOf, setStockOf] = useState(null);   // product whose breakdown we're viewing
  const [breakdown, setBreakdown] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api('/products'), api('/categories'), api('/branches')])
      .then(([p, c, b]) => { setProducts(p); setCategories(c); setBranches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  // load a product's per-branch breakdown when its stock is clicked
  useEffect(() => {
    if (!stockOf) { setBreakdown(null); return; }
    api(`/products/${stockOf.id}`).then((p) => setBreakdown(p.stock_by_branch)).catch(() => {});
  }, [stockOf]);

  const term = search.trim().toLowerCase();
  const filtered = products.filter(
    (p) => !term || p.name.toLowerCase().includes(term) || p.product_code.toLowerCase().includes(term)
  );

  // group products by category name (uncategorised last)
  const groups = {};
  filtered.forEach((p) => {
    const key = p.category_name || 'Uncategorised';
    (groups[key] = groups[key] || []).push(p);
  });
  const groupNames = Object.keys(groups).sort((a, b) =>
    a === 'Uncategorised' ? 1 : b === 'Uncategorised' ? -1 : a.localeCompare(b)
  );

  return (
    <div>
      <div className="page-head">
        <h1>Inventory</h1>
        <Tooltip text="Everything you stock for this company. Add products, restock by code, and move stock between the warehouse and your branches." />
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={() => setModal('categories')}>Categories</button>
        <button className="btn btn-ghost" onClick={() => setModal('transfer')}>Transfer</button>
        <button className="btn btn-ghost" onClick={() => setModal('restock')}>Restock</button>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add product</button>
      </div>

      <div className="toolbar-row">
        <div className="search">
          <span className="mag">🔍</span>
          <input
            className="input" placeholder="Search by name or code"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Spinner full />
      ) : products.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            <div className="big">📦</div>
            <h2 style={{ marginBottom: 6 }}>No products yet</h2>
            <p>Add your first product to start tracking stock.</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setModal('add')}>+ Add product</button>
          </div>
        </div>
      ) : (
        groupNames.map((g) => (
          <div className="cat-group" key={g}>
            <div className="cat-title">{g} <span className="count">· {groups[g].length}</span></div>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Code</th>
                    <th className="num">Cost</th>
                    <th className="num">Selling</th>
                    <th className="num">In stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups[g].map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td><span className="code">{p.product_code}</span></td>
                      <td className="num">{naira(p.cost_price)}</td>
                      <td className="num">{naira(p.recommended_price)}</td>
                      <td className="num">
                        <button className="stockbadge" onClick={() => setStockOf(p)} title="See where this stock is">
                          {p.total_stock} {p.unit}
                        </button>
                      </td>
                      <td className="num">
                        <button className="linkbtn" onClick={() => setEditing(p)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ---- popups ---- */}
      {modal === 'add' && (
        <AddProductModal categories={categories} branches={branches} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === 'restock' && (
        <RestockModal products={products} branches={branches} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === 'transfer' && (
        <TransferModal products={products} branches={branches} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === 'categories' && (
        <CategoriesModal categories={categories} onClose={() => setModal(null)} onChanged={load} />
      )}
      {editing && (
        <EditProductModal product={editing} categories={categories} onClose={() => setEditing(null)} onSaved={load} />
      )}

      {stockOf && (
        <Modal title={`Stock — ${stockOf.name}`} onClose={() => setStockOf(null)}>
          {!breakdown ? (
            <Spinner full />
          ) : (
            breakdown.map((b) => (
              <div className="list-line" key={b.branch_id}>
                <span className="grow">
                  {b.branch_name}{' '}
                  <span className={`tag ${b.is_warehouse ? 'tag-wh' : 'tag-store'}`}>
                    {b.is_warehouse ? 'Warehouse' : 'Store'}
                  </span>
                </span>
                <b>{b.quantity} {stockOf.unit}</b>
              </div>
            ))
          )}
        </Modal>
      )}
    </div>
  );
}
