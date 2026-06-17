// ============================================================
//  Manage categories: add, rename, and delete.
//  Deleting a category does NOT delete its products — they just
//  become "uncategorised".
// ============================================================
import { useState } from 'react';
import Modal from '../../components/Modal';
import { api } from '../../api/client';

export default function CategoriesModal({ categories, onClose, onChanged }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!newName.trim()) return;
    setError(''); setBusy(true);
    try {
      await api('/categories', { method: 'POST', body: { name: newName.trim() } });
      setNewName('');
      onChanged();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function rename(cat) {
    const name = window.prompt('New name for this category:', cat.name);
    if (!name || !name.trim()) return;
    setError('');
    try {
      await api(`/categories/${cat.id}`, { method: 'PUT', body: { name: name.trim() } });
      onChanged();
    } catch (err) { setError(err.message); }
  }

  async function remove(cat) {
    if (!window.confirm(`Delete "${cat.name}"? Its products will become uncategorised.`)) return;
    setError('');
    try {
      await api(`/categories/${cat.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) { setError(err.message); }
  }

  return (
    <Modal title="Categories" onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}

      <div className="toolbar-row" style={{ marginBottom: 16 }}>
        <input
          className="input grow" placeholder="New category name"
          value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" onClick={add} disabled={busy}>Add</button>
      </div>

      {categories.length === 0 ? (
        <p className="subtle">No categories yet. Add your first one above.</p>
      ) : (
        categories.map((c) => (
          <div className="list-line" key={c.id}>
            <span className="grow">{c.name}</span>
            <button className="linkbtn" onClick={() => rename(c)}>Rename</button>
            <button className="linkbtn" style={{ color: 'var(--clay)' }} onClick={() => remove(c)}>Delete</button>
          </div>
        ))
      )}
    </Modal>
  );
}
