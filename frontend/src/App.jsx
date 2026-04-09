import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { CompanyListPage } from './pages/CompanyListPage.jsx';
import { CompanyDetailPage } from './pages/CompanyDetailPage.jsx';
import { ContactListPage } from './pages/ContactListPage.jsx';
import { ContactDetailPage } from './pages/ContactDetailPage.jsx';

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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/companies" element={<CompanyListPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/contacts" element={<ContactListPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
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
