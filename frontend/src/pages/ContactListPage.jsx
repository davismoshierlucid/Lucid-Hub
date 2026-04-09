import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';

export function ContactListPage() {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company_id') || '';
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        const { data: res } = await api.get('/api/contacts', {
          params: {
            page,
            limit: 25,
            ...(companyId && { company_id: companyId }),
          },
        });
        if (!cancel) {
          setData(res.data);
          setTotalPages(res.total_pages);
          setErr(null);
        }
      } catch (e) {
        if (!cancel)
          setErr(e.response?.data?.error || e.response?.data?.message || e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [page, companyId]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white">Contacts</h1>
      <p className="mt-1 text-slate-400">People linked to coverage companies.</p>
      {companyId && (
        <p className="mt-2 text-sm text-slate-500">
          Filtered by company ·{' '}
          <Link to="/contacts" className="text-indigo-400 hover:underline">
            Clear
          </Link>
        </p>
      )}
      {err && (
        <p className="mt-4 text-sm text-red-300">{err}</p>
      )}
      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <ul className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10">
          {data.map((c) => (
            <li key={c.id}>
              <Link
                to={`/contacts/${c.id}`}
                className="block px-4 py-3 hover:bg-white/5"
              >
                <span className="font-medium text-white">
                  {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                    '—'}
                </span>
                <span className="ml-2 text-sm text-slate-400">
                  {c.email}
                  {c.title ? ` · ${c.title}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && data.length === 0 && (
        <p className="mt-8 text-slate-500">No contacts found.</p>
      )}
      {totalPages > 1 && (
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-white/10 px-3 py-1 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-white/10 px-3 py-1 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
