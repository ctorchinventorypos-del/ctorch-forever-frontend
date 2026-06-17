// ============================================================
//  Login page.
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">C</div>
          <h1>Welcome back</h1>
          <p>Sign in to CTORCH &amp; FOREVER inventory</p>
        </div>

        <form className="card card-pad" onSubmit={submit}>
          {error && <div className="banner-error">{error}</div>}

          <div className="field">
            <label htmlFor="u">Username</label>
            <input
              id="u" className="input" autoFocus
              value={username} onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="p">Password</label>
            <input
              id="p" className="input" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
