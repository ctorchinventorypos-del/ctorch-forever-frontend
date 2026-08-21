// ============================================================
//  Entry point: wires up routing and the two contexts
//  (who's logged in, and which company is active).
// ============================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { PermissionsProvider } from './context/PermissionsContext';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <PermissionsProvider>
            <App />
          </PermissionsProvider>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
