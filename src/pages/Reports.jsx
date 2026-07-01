// ============================================================
//  Reports: read-only summaries.
//    • Profit (admins only) — by day / month / year / product
//    • Sales summary — totals by day / month, split by sale type
//    • Branch performance — revenue (and profit for admins) per branch
//    • Inventory — stock valuation and the low-stock list
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';

export default function Reports() {
  const { isAdmin } = useAuth();
  const { activeId } = useCompany();

  const TABS = [
    isAdmin && { key: 'profit', label: 'Profit' },
    { key: 'sales', label: 'Sales summary' },
    { key: 'branch', label: 'Branch performance' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'cash', label: 'Daily cash' },
  ].filter(Boolean);

  const [tab, setTab] = useState(TABS[0].key);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [group, setGroup] = useState('month');
  const [cashDate, setCashDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const dateQS = useCallback(() => {
    const p = [];
    if (from) p.push(`from=${from}`);
    if (to) p.push(`to=${to}`);
    return p.length ? `&${p.join('&')}` : '';
  }, [from, to]);

  const load = useCallback(() => {
    setLoading(true);
    setData(null);
    let url;
    if (tab === 'profit') url = `/reports/profit?group=${group}${dateQS()}`;
    else if (tab === 'sales') url = `/reports/sales-summary?group=${group === 'year' ? 'month' : group}${dateQS()}`;
    else if (tab === 'branch') url = `/reports/branch-performance?x=1${dateQS()}`;
    else if (tab === 'cash') url = `/reports/daily-cash?date=${cashDate}`;
    else url = '/reports/inventory';
    api(url).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [tab, group, dateQS, cashDate]);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  return (
    <div>
      <div className="page-head">
        <h1>Reports</h1>
        <Tooltip text="Summaries of your sales, profit, branches and stock. Use the date boxes to focus on a period." />
      </div>

      <div className="seg" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {(tab === 'profit' || tab === 'sales' || tab === 'branch') && (
        <div className="toolbar-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {(tab === 'profit' || tab === 'sales') && (
            <select className="input" style={{ maxWidth: 170 }} value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="day">By day</option>
              <option value="month">By month</option>
              {tab === 'profit' && <option value="year">By year</option>}
              {tab === 'profit' && <option value="product">By product</option>}
            </select>
          )}
          <span className="subtle">From</span>
          <input className="input" style={{ maxWidth: 170 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="subtle">To</span>
          <input className="input" style={{ maxWidth: 170 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {(from || to) && <button className="linkbtn" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>}
        </div>
      )}

      {tab === 'cash' && (
        <div className="toolbar-row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="subtle">Date</span>
          <input className="input" style={{ maxWidth: 190 }} type="date" value={cashDate} onChange={(e) => setCashDate(e.target.value)} />
        </div>
      )}

      {loading ? <Spinner full /> : !data ? (
        <p className="subtle">No data.</p>
      ) : (
        <>
          {tab === 'profit' && <ProfitTable rows={data} byProduct={group === 'product'} />}
          {tab === 'sales' && <SalesTable rows={data} />}
          {tab === 'branch' && <BranchTable rows={data} isAdmin={isAdmin} />}
          {tab === 'inventory' && <InventoryReport data={data} isAdmin={isAdmin} />}
          {tab === 'cash' && <DailyCash data={data} />}
        </>
      )}
    </div>
  );
}

function DailyCash({ data }) {
  const m = data.methods;
  const fmtT = (d) => new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        <div className="card stat"><div className="label">Cash</div><div className="value">{naira(m.cash)}</div></div>
        <div className="card stat"><div className="label">Transfer</div><div className="value">{naira(m.transfer)}</div></div>
        <div className="card stat"><div className="label">POS card</div><div className="value">{naira(m.pos)}</div></div>
      </div>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card stat"><div className="label">Cheque</div><div className="value">{naira(m.cheque)}</div></div>
        <div className="card stat" style={{ gridColumn: 'span 2' }}>
          <div className="label">Total received</div>
          <div className="value" style={{ color: 'var(--green-700)' }}>{naira(data.total)}</div>
          <small className="subtle">{data.count} payment{data.count === 1 ? '' : 's'} on {data.date}</small>
        </div>
      </div>

      {data.list.length === 0 ? (
        <p className="subtle">No payments received on this date.</p>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Time</th><th>Type</th><th>Reference</th><th>From</th><th>Method</th><th>Received by</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {data.list.map((r, i) => (
                <tr key={i}>
                  <td className="subtle">{fmtT(r.created_at)}</td>
                  <td>{r.kind}</td>
                  <td>{r.ref !== '—' ? <span className="code">{r.ref}</span> : '—'}</td>
                  <td>{r.customer_name || 'Walk-in'}</td>
                  <td><span className="tag tag-store">{r.method}</span></td>
                  <td className="subtle">{r.received_by}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{naira(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan="6" style={{ fontWeight: 700 }}>Total</td><td className="num" style={{ fontWeight: 800 }}>{naira(data.total)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

function ProfitTable({ rows, byProduct }) {
  if (!rows.length) return <p className="subtle">No sales in this period.</p>;
  const t = rows.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>{byProduct ? 'Product' : 'Period'}</th>
            <th className="num">Units</th>
            <th className="num">Revenue</th>
            <th className="num">Cost</th>
            <th className="num">Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.label}</td>
              <td className="num">{r.units}</td>
              <td className="num">{naira(r.revenue)}</td>
              <td className="num subtle">{naira(r.cost)}</td>
              <td className="num" style={{ color: 'var(--green-700)', fontWeight: 700 }}>{naira(r.profit)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 700 }}>Total</td>
            <td></td>
            <td className="num" style={{ fontWeight: 800 }}>{naira(t.revenue)}</td>
            <td className="num" style={{ fontWeight: 800 }}>{naira(t.cost)}</td>
            <td className="num" style={{ fontWeight: 800, color: 'var(--green-700)' }}>{naira(t.profit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SalesTable({ rows }) {
  if (!rows.length) return <p className="subtle">No sales in this period.</p>;
  const t = rows.reduce((a, r) => ({ count: a.count + r.sales_count, revenue: a.revenue + r.revenue, collected: a.collected + r.collected }), { count: 0, revenue: 0, collected: 0 });
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>Period</th>
            <th className="num">Sales</th>
            <th className="num">Cash</th>
            <th className="num">Credit</th>
            <th className="num">Reseller</th>
            <th className="num">Revenue</th>
            <th className="num">Collected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.label}</td>
              <td className="num">{r.sales_count}</td>
              <td className="num subtle">{naira(r.cash)}</td>
              <td className="num subtle">{naira(r.credit)}</td>
              <td className="num subtle">{naira(r.reseller)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{naira(r.revenue)}</td>
              <td className="num" style={{ color: 'var(--green-700)' }}>{naira(r.collected)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 700 }}>Total</td>
            <td className="num" style={{ fontWeight: 800 }}>{t.count}</td>
            <td colSpan="3"></td>
            <td className="num" style={{ fontWeight: 800 }}>{naira(t.revenue)}</td>
            <td className="num" style={{ fontWeight: 800 }}>{naira(t.collected)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BranchTable({ rows, isAdmin }) {
  if (!rows.length) return <p className="subtle">No branches.</p>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Type</th>
            <th className="num">Sales</th>
            <th className="num">Revenue</th>
            {isAdmin && <th className="num">Profit</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td><span className={`tag ${r.is_warehouse ? 'tag-wh' : 'tag-store'}`}>{r.is_warehouse ? 'Warehouse' : 'Store'}</span></td>
              <td className="num">{r.sales_count}</td>
              <td className="num" style={{ fontWeight: 700 }}>{naira(r.revenue)}</td>
              {isAdmin && <td className="num" style={{ color: 'var(--green-700)', fontWeight: 700 }}>{naira(r.profit || 0)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryReport({ data, isAdmin }) {
  const { items, totals } = data;
  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="label">Products</div>
          <div className="value">{totals.product_count}</div>
        </div>
        {isAdmin && (
          <div className="card stat">
            <div className="label">Stock at cost <Tooltip text="What your current stock is worth at cost price." /></div>
            <div className="value">{naira(totals.cost_value || 0)}</div>
          </div>
        )}
        <div className="card stat">
          <div className="label">Low on stock <Tooltip text="Products at or below their low-stock level." /></div>
          <div className="value" style={{ color: totals.low_count ? 'var(--clay)' : 'inherit' }}>{totals.low_count}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="num">In stock</th>
              <th className="num">Low level</th>
              {isAdmin && <th className="num">Value at cost</th>}
              <th className="num">Value at selling</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} style={p.low ? { background: '#fdf6f2' } : null}>
                <td>{p.name} {p.low && <span className="tag" style={{ background: '#fbeee8', color: '#b9512f', marginLeft: 6 }}>Low</span>}</td>
                <td className="subtle">{p.category_name || '—'}</td>
                <td className="num">{p.total_stock} {p.unit}</td>
                <td className="num subtle">{p.reorder_level}</td>
                {isAdmin && <td className="num subtle">{naira(p.cost_value || 0)}</td>}
                <td className="num">{naira(p.retail_value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={isAdmin ? 4 : 3} style={{ fontWeight: 700 }}>Totals</td>
              {isAdmin && <td className="num" style={{ fontWeight: 800 }}>{naira(totals.cost_value || 0)}</td>}
              <td className="num" style={{ fontWeight: 800 }}>{naira(totals.retail_value)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
