import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <PlaceholderPage
                title="Dashboard"
                description="Your daily command center for origination and execution. Content will load here after login."
              />
            }
          />
          <Route
            path="/companies"
            element={
              <PlaceholderPage
                title="Companies"
                description="Coverage universe and company records."
              />
            }
          />
          <Route
            path="/contacts"
            element={
              <PlaceholderPage
                title="Contacts"
                description="People linked to companies and interaction history."
              />
            }
          />
          <Route
            path="/deals"
            element={
              <PlaceholderPage
                title="Deals"
                description="Mandates and active deal workspaces."
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
