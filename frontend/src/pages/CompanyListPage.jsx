import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useDebounced } from '../hooks/useDebounced.js';
import { HealthBadge, PriorityBadge } from '../components/HealthBadge.jsx';
import { AddCompanyModal } from '../components/AddCompanyModal.jsx';

export function CompanyListPage() {
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [sort, setSort] = useState('priority_score');
  const [order, setOrder] = useState('desc');
  const [coverageFilter, setCoverageFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounced(searchInput, 300);
  const [searchHits, setSearchHits] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (debouncedSearch.trim()) {
        setLoading(true);
        try {
          const { data: res } = await api.get('/api/search', {
            params: { q: debouncedSearch.trim() },
          });
          if (!cancel) {
            setSearchHits(res);
            setErr(null);
          }
        } catch (e) {
          if (!cancel)
            setErr(e.response?.data?.message || e.response?.data?.error || e.message);
        } finally {
          if (!cancel) setLoading(false);
        }
        return;
      }
      setSearchHits(null);
      setLoading(true);
      setErr(null);
      try {
        const { data: res } = await api.get('/api/companies', {
          params: {
            page,
            limit: 20,
            sort,
            order,
            ...(coverageFilter && { coverage_status: coverageFilter }),
            ...(sectorFilter && { sector: sectorFilter }),
          },
        });
        if (!cancel) {
          setData(res.data);
          setTotalPages(res.total_pages);
        }
      } catch (e) {
        if (!cancel)
          setErr(e.response?.data?.message || e.response?.data?.error || e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [page, sort, order, coverageFilter, sectorFilter, debouncedSearch, listVersion]);

  function toggleOrder(col) {
    if (sort !== col) {
      setSort(col);
      setOrder(col === 'name' ? 'asc' : 'desc');
    } else {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    }
    setPage(1);
  }

  const searching = Boolean(debouncedSearch.trim());

  return (
    <div>
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-white">Companies</h1>
        <p className="mt-1 text-slate-400">
          Coverage universe — sort, filter, and search.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Add company
      </button>
    </div>

    <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
      <input
        type="search"
        placeholder="Search companies and contacts…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 lg:max-w-md"
      />
      {!searching && (
        <>
          <select
            value={coverageFilter}
            onChange={(e) => {
              setCoverageFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">All coverage</option>
            <option value="Active">Active</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Inactive">Inactive</option>
          </select>
          <input
            type="text"
            placeholder="Sector (exact)"
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </>
      )}
    </div>

    {!searching && (
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="text-slate-500">Sort:</span>
        {[
          ['priority_score', 'Priority'],
          ['name', 'Name'],
          ['coverage_status', 'Coverage'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleOrder(key)}
            className={`rounded-md px-2 py-1 ${
              sort === key
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
            {sort === key ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
        ))}
      </div>
    )}

    {err && (
      <p className="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-500/30">
        {err}
      </p>
    )}

    {loading && <p className="mt-8 text-slate-500">Loading…</p>}

    {!loading && searching && searchHits && (
      <div className="mt-8 space-y-8">
        {searchHits.companies?.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-white">Companies</h2>
            <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
              {searchHits.companies.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/companies/${c.id}`}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-white">
                      {c.name}
                      {c.ticker ? ` (${c.ticker})` : ''}
                    </span>
                    <span className="text-sm text-slate-400">{c.sector}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {searchHits.contacts?.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-white">Contacts</h2>
            <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
              {searchHits.contacts.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/contacts/${c.id}`}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-white/5"
                  >
                    <span className="font-medium text-white">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                        c.email}
                    </span>
                    <span className="text-sm text-slate-400">
                      {c.company_name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!searchHits.companies?.length && !searchHits.contacts?.length && (
          <p className="text-slate-500">No matches.</p>
        )}
      </div>
    )}

    {!loading && !searching && (
      <>
        <div className="mt-8 hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Sector / coverage</th>
                <th className="px-4 py-3">Scores</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      to={`/companies/${c.id}`}
                      className="font-medium text-indigo-300 hover:text-indigo-200"
                    >
                      {c.name}
                      {c.ticker ? ` · ${c.ticker}` : ''}
                    </Link>
                    {c.banker_flag && (
                      <span className="ml-2 text-amber-400" title="Banker flagged">
                        ⚑
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.sector}
                    <br />
                    <span className="text-slate-500">{c.coverage_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <PriorityBadge score={c.priority_score} />
                      <HealthBadge score={c.data_health_score} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/companies/${c.id}`}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-3 md:hidden">
          {data.map((c) => (
            <Link
              key={c.id}
              to={`/companies/${c.id}`}
              className="block rounded-xl border border-white/10 bg-slate-900/40 p-4 hover:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-white">{c.name}</span>
                  {c.ticker && (
                    <span className="text-slate-400"> · {c.ticker}</span>
                  )}
                  {c.banker_flag && (
                    <span className="ml-1 text-amber-400" title="Flagged">
                      ⚑
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {c.sector} · {c.coverage_status}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PriorityBadge score={c.priority_score} />
                <HealthBadge score={c.data_health_score} />
              </div>
            </Link>
          ))}
        </div>

        {data.length === 0 && (
          <p className="mt-8 text-slate-500">No companies yet. Add one to begin.</p>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
      </>
    )}

    <AddCompanyModal
      open={addOpen}
      onClose={() => setAddOpen(false)}
      onCreated={() => {
        setAddOpen(false);
        setPage(1);
        setSearchInput('');
        setSearchHits(null);
        setListVersion((v) => v + 1);
      }}
    />
  </div>
);
}
