// ============================================================
//  Quotations / proforma invoices. Create a price offer, print it, and —
//  when the customer agrees — convert it to a real sale in one tap.
//  Admins can revise a quote (saves a new revision); the list shows only
//  the current version of each quote, with older versions in its history.
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { naira } from '../utils/format';
import Tooltip from '../components/Tooltip';
import Spinner from '../components/Spinner';
import QuoteModal from './quotations/QuoteModal';
import QuoteHistoryModal from './quotations/QuoteHistoryModal';

export default function Quotations() {
  const { activeId } = useCompany();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [revising, setRevising] = useState(null);   // quote being revised
  const [history, setHistory] = useState(null);     // quote whose history we're viewing

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
    if (!window.confirm(`Delete quotation ${q.quote_number} and all its revisions?`)) return;
    try { await api(`/quotations/${q.id}`, { method: 'DELETE' }); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Quotations</h1>
        <Tooltip text="Price offers for customers. A quote doesn't affect stock. Admins can revise a quote when a customer changes their order — older versions stay in the history. When the customer agrees, convert it into a real sale in one tap." />
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
                  <td>
                    <span className="code">{q.quote_number}</span>
                    {q.revision > 1 && <span className="tag tag-wh" style={{ marginLeft: 8 }}>Rev {q.revision}</span>}
                  </td>
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
                    {q.status === 'open' && isAdmin && <button className="linkbtn" onClick={() => setRevising(q)}>✏️ Revise</button>}
                    {'  '}
                    {q.status === 'open' && <button className="linkbtn" onClick={() => convert(q)}>➡️ To sale</button>}
                    {'  '}
                    {Number(q.revision_count) > 1 && <button className="linkbtn" onClick={() => setHistory(q)}>🕘 History</button>}
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
      {revising && <QuoteModal reviseOf={revising} onClose={() => setRevising(null)} onSaved={load} />}
      {history && <QuoteHistoryModal quote={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
