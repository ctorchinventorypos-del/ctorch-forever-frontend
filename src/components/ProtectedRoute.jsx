// ============================================================
//  ProtectedRoute: if nobody is logged in, send them to /login.
//  Admin-only pages can also pass adminOnly.
// ============================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly }) {
  const { user, isAdmin } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}
