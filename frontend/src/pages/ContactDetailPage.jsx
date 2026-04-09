import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export function ContactDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [payload, setPayload] = useState(null);
  const [form, setForm] = useState({});
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/contacts/${id}`);
        if (cancel) return;
        setPayload(data);
        const c = data.contact;
        setForm({
          first_name: c.first_name ?? '',
          last_name: c.last_name ?? '',
          email: c.email ?? '',
          title: c.title ?? '',
          phone: c.phone ?? '',
        });
        setErr(null);
      } catch (e) {
        if (!cancel)
          setErr(e.response?.data?.error || e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [id]);

  async function save() {
    setSaveMsg(null);
    try {
      await api.put(`/api/contacts/${id}`, {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        title: form.title || null,
        phone: form.phone || null,
      });
      const { data } = await api.get(`/api/contacts/${id}`);
      setPayload(data);
      setSaveMsg('Saved.');
    } catch (e) {
      setSaveMsg(e.response?.data?.error || e.message);
    }
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (err) return <p className="text-red-300">{err}</p>;
  if (!payload) return null;

  const { contact, company, recent_outreach } = payload;
  const displayName =
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.email ||
    'Contact';

  return (
    <div>
      <Link
        to="/contacts"
        className="text-sm text-indigo-400 hover:text-indigo-200"
      >
        ← Contacts
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-white">{displayName}</h1>
      {company && (
        <p className="mt-2 text-slate-400">
          Company:{' '}
          <Link
            to={`/companies/${company.id}`}
            className="text-indigo-300 hover:text-indigo-200"
          >
            {company.name}
          </Link>
        </p>
      )}

      <section className="mt-10 max-w-xl">
        <h2 className="text-lg font-medium text-white">Profile</h2>
        <div className="mt-4 space-y-3">
          {['first_name', 'last_name', 'email', 'title', 'phone'].map((key) => (
            <label key={key} className="block text-sm">
              <span className="text-slate-500 capitalize">
                {key.replace('_', ' ')}
              </span>
              <input
                type="text"
                value={form[key] ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Save changes
        </button>
        {saveMsg && (
          <span className="ml-3 text-sm text-slate-400">{saveMsg}</span>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">Interaction history</h2>
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
          {recent_outreach?.length ? (
            <div className="space-y-4 text-left">
              {recent_outreach.map((o) => (
                <div key={o.id} className="border-b border-white/5 pb-3">
                  <p className="text-xs uppercase text-slate-500">
                    {o.activity_type} ·{' '}
                    {o.activity_timestamp
                      ? new Date(o.activity_timestamp).toLocaleString()
                      : ''}
                  </p>
                  <p className="text-white">{o.subject}</p>
                </div>
              ))}
            </div>
          ) : (
            'Sprint 6 — full interaction history from M365 auto-logging.'
          )}
        </div>
      </section>
    </div>
  );
}
