// ============================================================
//  App: the routes. Public /login, everything else protected
//  and wrapped in the Layout shell.
// ============================================================
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Records from './pages/Records';
import Reports from './pages/Reports';
import Debtors from './pages/Debtors';
import Quotations from './pages/Quotations';
import Branches from './pages/Branches';
import Users from './pages/Users';

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
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/debtors" element={<Debtors />} />
        <Route path="/records" element={<Records />} />
        <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        <Route path="/branches" element={<Branches />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
