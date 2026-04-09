import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/me')
      .then(() => {
        if (!cancelled) setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('unauthorized');
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }
  if (status === 'unauthorized') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
