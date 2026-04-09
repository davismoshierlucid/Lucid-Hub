import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client.js';

const linkClass = ({ isActive }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-500/20 text-indigo-200'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  ].join(' ');

export function AppLayout() {
  async function handleLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* still navigate */
    }
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight text-white">
            Lucid Hub
          </span>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/companies" className={linkClass}>
              Companies
            </NavLink>
            <NavLink to="/contacts" className={linkClass}>
              Contacts
            </NavLink>
            <NavLink to="/deals" className={linkClass}>
              Deals
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
