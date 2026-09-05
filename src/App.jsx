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
import Account from './pages/Account';
import Permissions from './pages/Permissions';
import Expenses from './pages/Expenses';
import Activity from './pages/Activity';
import TransferRecords from './pages/TransferRecords';
import StockAsAt from './pages/StockAsAt';
import StockHistory from './pages/StockHistory';
import WarehouseSale from './pages/WarehouseSale';
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
        <Route path="/warehouse-sale" element={<WarehouseSale />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/debtors" element={<Debtors />} />
        <Route path="/records" element={<Records />} />
        <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute adminOnly><Account /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute adminOnly><Permissions /></ProtectedRoute>} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/transfer-records" element={<TransferRecords />} />
        <Route path="/stock-as-at" element={<StockAsAt />} />
        <Route path="/stock-history" element={<StockHistory />} />
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
