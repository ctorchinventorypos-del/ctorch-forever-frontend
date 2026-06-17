// ============================================================
//  App: the routes. Public /login, everything else protected
//  and wrapped in the Layout shell.
// ============================================================
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Records from './pages/Records';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/records" element={<Records />} />
        <Route path="/branches" element={<Placeholder title="Branches" />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <Placeholder title="Users" note="Admin-only user management is coming in a later pass." />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
