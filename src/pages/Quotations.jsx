// ============================================================
//  Quotations / proforma invoices. Create a price offer, print it for
//  the customer, and — when they agree — convert it into a real sale in
//  one tap (it loads the items into the Sales screen).
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import QuoteModal from './quotations/QuoteModal';

export default function Quotations() {
  const { activeId } = useCompany();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api('/quotations').then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeId) load(); }, [activeId, load]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  async function convert(q) {
    try {
      const full = await api(`/quotations/${q.id}`);
      await api(`/quotations/${q.id}/status`, { method: 'PATCH', body: { status: 'converted' } });
      navigate('/sales', { state: { quote: { quote_number: full.quote_number, items: full.items } } });
    } catch (err) {
      alert(err.message);
    }
  }

  async function del(q) {
    if (!window.confirm(`Delete quotation ${q.quote_number}?`)) return;
    try { await api(`/quotations/${q.id}`, { method: 'DELETE' }); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Quotations</h1>
        <Tooltip text="Price offers for customers. A quote doesn't affect stock. When the customer agrees, convert it into a real sale in one tap." />
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ New quotation</button>
      </div>

      {loading ? (
        <Spinner full />
      ) : rows.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            <div className="big">📝</div>
            <h2 style={{ marginBottom: 6 }}>No quotations yet</h2>
            <p>Create a quote when a customer asks "how much for this list?"</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>+ New quotation</button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Quote</th>
                <th>For</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <td><span className="code">{q.quote_number}</span></td>
                  <td>{q.customer_name || '—'}</td>
                  <td className="subtle">{fmtDate(q.created_at)}</td>
                  <td>
                    {q.status === 'converted'
                      ? <span className="tag tag-store">Converted</span>
                      : <span className="tag tag-wh">Open</span>}
                  </td>
                  <td className="num" style={{ fontWeight: 700 }}>{naira(q.total_amount)}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    <button className="linkbtn" onClick={() => window.open(`/quote.html?id=${q.id}`, '_blank')}>🖨️ Print</button>
                    {'  '}
                    {q.status !== 'converted' && <button className="linkbtn" onClick={() => convert(q)}>➡️ To sale</button>}
                    {'  '}
                    <button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => del(q)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && <QuoteModal onClose={() => setAdding(false)} onSaved={load} />}
    </div>
  );
}
