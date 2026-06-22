// ============================================================
//  Customer detail: balance, sales history, payment history,
//  and buttons to record a payment or a return.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { api } from '../../api/client';
import { naira } from '../../utils/format';
import RecordPaymentModal from './RecordPaymentModal';
import RecordReturnModal from './RecordReturnModal';

export default function CustomerDetailModal({ customerId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [sub, setSub] = useState(null); // 'payment' | 'return'

  const load = useCallback(() => {
    api(`/customers/${customerId}`).then(setData).catch(() => {});
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Modal title={data ? data.name : 'Customer'} wide onClose={onClose}>
      {!data ? (
        <Spinner full />
      ) : (
        <>
          <div className="balance-hero">
            <div style={{ flex: 1 }}>
              <div className="subtle" style={{ fontSize: 13 }}>Currently owes</div>
              <div className={`amt owed${Number(data.balance_owed) === 0 ? ' zero' : ''}`}>
                {naira(data.balance_owed)}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setSub('payment')}>Record payment</button>
            <button className="btn btn-ghost" onClick={() => setSub('return')}>Record return</button>
            <button className="btn btn-ghost" onClick={() => window.open(`/statement.html?id=${customerId}`, '_blank')}>📄 Statement</button>
          </div>
          {data.phone && <p className="subtle" style={{ margin: '4px 0 0' }}>📞 {data.phone}</p>}

          <div className="sectionhead">Sales</div>
          {data.sales.length === 0 ? (
            <p className="subtle">No sales yet.</p>
          ) : (
            data.sales.map((s) => (
              <div className="list-line" key={s.id}>
                <span className="grow">
                  <span className="code">{s.invoice_number}</span> · {fmtDate(s.created_at)}
                </span>
                <b>{naira(s.total_amount)}</b>
              </div>
            ))
          )}

          <div className="sectionhead">Payments</div>
          {data.payments.length === 0 ? (
            <p className="subtle">No payments yet.</p>
          ) : (
            data.payments.map((p) => (
              <div className="list-line" key={p.id}>
                <span className="grow">{fmtDate(p.created_at)}{p.note ? ` · ${p.note}` : ''}</span>
                <b style={{ color: 'var(--green-700)' }}>{naira(p.amount)}</b>
              </div>
            ))
          )}

          {sub === 'payment' && (
            <RecordPaymentModal
              customer={data}
              onClose={() => setSub(null)}
              onSaved={() => { load(); onChanged && onChanged(); }}
            />
          )}
          {sub === 'return' && (
            <RecordReturnModal
              customer={data}
              sales={data.sales}
              onClose={() => setSub(null)}
              onSaved={() => { load(); onChanged && onChanged(); }}
            />
          )}
        </>
      )}
    </Modal>
  );
}
