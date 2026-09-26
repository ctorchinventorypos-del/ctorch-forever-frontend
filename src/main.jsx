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

// Ensure notch-/toolbar-safe rendering on every mobile browser
// (enables env(safe-area-inset-*) and correct dynamic-viewport behaviour).
try {
  let vp = document.querySelector('meta[name="viewport"]');
  if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
  vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
} catch (e) { /* non-fatal */ }

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
