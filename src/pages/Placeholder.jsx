// ============================================================
//  Placeholder: a friendly "coming next" screen for sections
//  we build in the next passes (Inventory, Sales, etc.).
// ============================================================
export default function Placeholder({ title, note }) {
  return (
    <div>
      <div className="page-head"><h1>{title}</h1></div>
      <div className="card card-pad">
        <div className="empty">
          <div className="big">🛠️</div>
          <h2 style={{ marginBottom: 6 }}>{title} is on the way</h2>
          <p>{note || 'This screen is being built in the next update. The backend for it is already live and tested.'}</p>
        </div>
      </div>
    </div>
  );
}
