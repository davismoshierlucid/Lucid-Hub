import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { HealthBadge, PriorityBadge } from '../components/HealthBadge.jsx';

function fieldLabel(k) {
  return k.replace(/_/g, ' ');
}

export function CompanyDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [payload, setPayload] = useState(null);
  const [form, setForm] = useState({});
  const [saveMsg, setSaveMsg] = useState(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagErr, setFlagErr] = useState(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.get(`/api/companies/${id}`);
        if (cancel) return;
        setPayload(data);
        const c = data.company;
        setForm({
          name: c.name ?? '',
          ticker: c.ticker ?? '',
          exchange: c.exchange ?? '',
          sector: c.sector ?? '',
          sub_sector: c.sub_sector ?? '',
          market_cap_band: c.market_cap_band ?? '',
          coverage_status: c.coverage_status ?? '',
          origination_status: c.origination_status ?? '',
          situation_type: c.situation_type ?? '',
          last_interaction: c.last_interaction
            ? c.last_interaction.slice(0, 16)
            : '',
          last_news_reviewed_at: c.last_news_reviewed_at
            ? c.last_news_reviewed_at.slice(0, 16)
            : '',
          angle_scores:
            c.angle_scores != null ? JSON.stringify(c.angle_scores, null, 2) : '',
        });
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

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaveMsg(null);
    const body = { ...form };
    if (body.last_interaction === '') body.last_interaction = null;
    else if (body.last_interaction)
      body.last_interaction = new Date(body.last_interaction).toISOString();
    if (body.last_news_reviewed_at === '') body.last_news_reviewed_at = null;
    else if (body.last_news_reviewed_at)
      body.last_news_reviewed_at = new Date(
        body.last_news_reviewed_at
      ).toISOString();
    if (body.angle_scores?.trim()) {
      try {
        body.angle_scores = JSON.parse(body.angle_scores);
      } catch {
        setSaveMsg('Invalid JSON in angle scores');
        return;
      }
    } else {
      body.angle_scores = null;
    }
    try {
      const { data: updated } = await api.put(`/api/companies/${id}`, body);
      const { data: full } = await api.get(`/api/companies/${id}`);
      setPayload(full);
      setForm((f) => ({
        ...f,
        name: updated.name,
        ticker: updated.ticker ?? '',
        exchange: updated.exchange ?? '',
        sector: updated.sector ?? '',
        sub_sector: updated.sub_sector ?? '',
        market_cap_band: updated.market_cap_band ?? '',
        coverage_status: updated.coverage_status ?? '',
        origination_status: updated.origination_status ?? '',
        situation_type: updated.situation_type ?? '',
        last_interaction: updated.last_interaction
          ? updated.last_interaction.slice(0, 16)
          : '',
        last_news_reviewed_at: updated.last_news_reviewed_at
          ? updated.last_news_reviewed_at.slice(0, 16)
          : '',
        angle_scores:
          updated.angle_scores != null
            ? JSON.stringify(updated.angle_scores, null, 2)
            : '',
      }));
      setSaveMsg('Saved.');
    } catch (e) {
      setSaveMsg(e.response?.data?.error || e.message);
    }
  }

  async function submitFlag() {
    setFlagErr(null);
    try {
      await api.post(`/api/companies/${id}/flag`, {
        banker_flag_reason: flagReason,
      });
    } catch (e) {
      setFlagErr(e.response?.data?.error || e.message);
      return;
    }
    setFlagOpen(false);
    setFlagReason('');
    const { data: full } = await api.get(`/api/companies/${id}`);
    setPayload(full);
  }

  async function unflag() {
    await api.delete(`/api/companies/${id}/flag`);
    const { data: full } = await api.get(`/api/companies/${id}`);
    setPayload(full);
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (err) return <p className="text-red-300">{err}</p>;
  if (!payload) return null;

  const { company, contacts, recent_outreach, open_deal_tasks, data_health } =
    payload;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/companies"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            ← Companies
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            {company.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <PriorityBadge score={company.priority_score} />
            <HealthBadge score={company.data_health_score} />
            {company.banker_flag && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200 ring-1 ring-amber-500/40">
                Banker flagged
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {company.banker_flag ? (
            <>
              <p className="max-w-md text-right text-sm text-amber-200/90">
                <span className="text-slate-500">Reason: </span>
                {company.banker_flag_reason}
              </p>
              <button
                type="button"
                onClick={() => unflag()}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                Unflag
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setFlagOpen(true)}
              className="rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Flag company
            </button>
          )}
        </div>
      </div>

      {flagOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6">
            <h3 className="font-semibold text-white">Flag reason</h3>
            <p className="mt-1 text-sm text-slate-400">
              One line, visible to the team.
            </p>
            <input
              type="text"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              placeholder="Reason required"
            />
            {flagErr && <p className="mt-2 text-sm text-red-300">{flagErr}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFlagOpen(false);
                  setFlagReason('');
                  setFlagErr(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFlag}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Confirm flag
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-medium text-white">Profile</h2>
          <div className="mt-4 space-y-3">
            {[
              'name',
              'ticker',
              'exchange',
              'sector',
              'sub_sector',
              'market_cap_band',
              'situation_type',
            ].map((key) => (
              <label key={key} className="block text-sm">
                <span className="capitalize text-slate-500">
                  {fieldLabel(key)}
                </span>
                <input
                  type="text"
                  value={form[key] ?? ''}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-slate-500">Coverage status</span>
              <select
                value={form.coverage_status}
                onChange={(e) => setField('coverage_status', e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              >
                <option value="Active">Active</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">Origination status</span>
              <select
                value={form.origination_status}
                onChange={(e) => setField('origination_status', e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              >
                <option value="Early">Early</option>
                <option value="Engaged">Engaged</option>
                <option value="Active Process">Active Process</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">Last interaction</span>
              <input
                type="datetime-local"
                value={form.last_interaction}
                onChange={(e) => setField('last_interaction', e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">Last news reviewed</span>
              <input
                type="datetime-local"
                value={form.last_news_reviewed_at}
                onChange={(e) =>
                  setField('last_news_reviewed_at', e.target.value)
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-500">Angle scores (JSON)</span>
              <textarea
                value={form.angle_scores}
                onChange={(e) => setField('angle_scores', e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Save changes
            </button>
            {saveMsg && (
              <span className="text-sm text-slate-400">{saveMsg}</span>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">Data health</h2>
          <p className="mt-1 text-sm text-slate-400">
            Starting from 100. Deductions per Lucid Hub policy.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <p className="text-2xl font-semibold text-white">
              {data_health?.score ?? company.data_health_score}
            </p>
            <HealthBadge score={data_health?.score ?? company.data_health_score} />
            <ul className="mt-4 space-y-2 text-sm">
              {(data_health?.breakdown || []).length === 0 ? (
                <li className="text-emerald-400/90">No deductions.</li>
              ) : (
                data_health.breakdown.map((b) => (
                  <li key={b.code} className="flex justify-between text-slate-300">
                    <span>{b.label}</span>
                    <span className="text-red-300/90">−{b.deduction}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-white">Contacts</h2>
          <Link
            to={`/contacts?company_id=${company.id}`}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            All contacts for this company →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
          {contacts?.length ? (
            contacts.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/contacts/${c.id}`}
                  className="block px-4 py-3 hover:bg-white/5"
                >
                  <span className="text-white">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                      c.email}
                  </span>
                  <span className="ml-2 text-sm text-slate-500">
                    {c.title}
                    {c.email ? ` · ${c.email}` : ''}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-slate-500">No contacts linked.</li>
          )}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">Outreach timeline</h2>
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
          {recent_outreach?.length
            ? recent_outreach.map((o) => (
                <div
                  key={o.id}
                  className="mb-4 border-b border-white/5 pb-4 text-left last:mb-0 last:border-0"
                >
                  <p className="text-xs uppercase text-slate-500">
                    {o.activity_type} ·{' '}
                    {o.activity_timestamp
                      ? new Date(o.activity_timestamp).toLocaleString()
                      : ''}
                  </p>
                  <p className="text-white">{o.subject}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {o.body}
                  </p>
                </div>
              ))
            : 'Sprint 6 — M365 auto-logging will populate this timeline.'}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">News & triggers</h2>
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
          Sprint 3 — FactSet and overnight trigger feed will appear here.
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">Open deal tasks</h2>
        <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
          {open_deal_tasks?.length ? (
            open_deal_tasks.map((t) => (
              <li key={t.id} className="px-4 py-3 text-sm">
                <span className="text-white">{t.title}</span>
                <span className="text-slate-500">
                  {' '}
                  · {t.deal_type} {t.deal_stage ? `· ${t.deal_stage}` : ''}
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-slate-500">No open tasks.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
