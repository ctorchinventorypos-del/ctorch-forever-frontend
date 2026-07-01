// ============================================================
//  Shows every revision of a quotation. Each row can be printed so you
//  can see exactly what was offered at each stage.
// ============================================================
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { naira } from '../../utils/format';

export default function QuoteHistoryModal({ quote, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/quotations/${quote.id}/history`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [quote]);

  const fmtDate = (d) => new Date(d).toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusTag = (s) =>
    s === 'converted' ? <span className="tag tag-store">Converted</span>
    : s === 'superseded' ? <span className="tag" style={{ background: '#eee', color: '#777' }}>Superseded</span>
    : <span className="tag tag-wh">Current</span>;

  return (
    <Modal title="Revision history" onClose={onClose} footer={<button className="btn btn-ghost" onClick={onClose}>Close</button>}>
      {error && <div className="banner-error">{error}</div>}
      {!rows ? (
        <p className="subtle">Loading…</p>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Revision</th><th>Date</th><th>Status</th><th className="num">Total</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><span className="code">{r.quote_number}</span></td>
                  <td className="subtle">{fmtDate(r.created_at)}</td>
                  <td>{statusTag(r.status)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{naira(r.total_amount)}</td>
                  <td className="num">
                    <button className="linkbtn" onClick={() => window.open(`/quote.html?id=${r.id}`, '_blank')}>🖨️ Print</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
