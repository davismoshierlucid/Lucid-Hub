import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { PriorityBadge } from '../components/HealthBadge.jsx';
import { DraftEmailModal } from '../components/DraftEmailModal.jsx';
import { outreachIntentForActionCard } from '../utils/outreachIntentFromAction.js';

function dbErr(e) {
  if (e.response?.status === 503) {
    return e.response?.data?.message || 'Database not yet configured';
  }
  return e.response?.data?.error || e.message || 'Failed to load';
}

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function lastContactSummary(rec) {
  if (!rec) return 'No prior contact';
  const bit = [rec.activity_type, rec.subject].filter(Boolean).join(' · ');
  return bit || 'Activity logged';
}

export function DashboardPage() {
  const [actions, setActions] = useState([]);
  const [actionsErr, setActionsErr] = useState(null);
  const [stale, setStale] = useState([]);
  const [staleErr, setStaleErr] = useState(null);
  const [feed, setFeed] = useState([]);
  const [feedErr, setFeedErr] = useState(null);
  const [snoozeFor, setSnoozeFor] = useState(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeBusy, setSnoozeBusy] = useState(false);
  const [customIntent, setCustomIntent] = useState({});
  const [draftModal, setDraftModal] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const { data } = await api.get('/api/dashboard/action-list');
      setActions(data);
      setActionsErr(null);
    } catch (e) {
      setActions([]);
      setActionsErr(dbErr(e));
    }
    try {
      const { data } = await api.get('/api/dashboard/stale-relationships');
      setStale(data);
      setStaleErr(null);
    } catch (e) {
      setStale([]);
      setStaleErr(dbErr(e));
    }
    try {
      const { data } = await api.get('/api/dashboard/recent-activity');
      setFeed(data);
      setFeedErr(null);
    } catch (e) {
      setFeed([]);
      setFeedErr(dbErr(e));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function confirmSnooze(companyId) {
    if (!snoozeDate) {
      alert('Select a snooze date.');
      return;
    }
    const d = new Date(`${snoozeDate}T23:59:59`);
    if (d.getTime() <= Date.now()) {
      alert('Snooze date must be in the future.');
      return;
    }
    setSnoozeBusy(true);
    try {
      await api.post(`/api/companies/${companyId}/snooze`, {
        snooze_until_date: d.toISOString(),
      });
      setActions((prev) => prev.filter((a) => a.company_id !== companyId));
      setSnoozeFor(null);
      setSnoozeDate('');
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSnoozeBusy(false);
    }
  }

  function minSnoozeDate() {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }

  function lastContactIsoForAction(a) {
    return (
      a.last_contact?.activity_timestamp ??
      a.last_outreach_date ??
      a.last_interaction ??
      null
    );
  }

  return (
    <div className="space-y-14">
      <DraftEmailModal
        open={!!draftModal}
        onClose={() => setDraftModal(null)}
        companyId={draftModal?.companyId}
        companyName={draftModal?.companyName ?? ''}
        lastContactIso={draftModal?.lastContactIso ?? null}
        outreachAttemptCount={draftModal?.outreachAttemptCount ?? 0}
        initialIntent={draftModal?.initialIntent ?? ''}
        initialSpecificNotes={draftModal?.initialSpecificNotes ?? ''}
        onSaved={loadAll}
      />
      <header>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-slate-400">
          Daily action engine and firm visibility.
        </p>
      </header>

      {/* Section 1 */}
      <section>
        <h2 className="text-xl font-semibold text-white">Act on these today</h2>
        {actionsErr && (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-500/30">
            {actionsErr}
          </p>
        )}
        {!actionsErr && actions.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No companies on the action list.</p>
        )}
        <ul className="mt-4 space-y-4">
          {actions.map((a) => (
            <li
              key={a.company_id}
              className="rounded-xl border border-white/10 bg-slate-900/50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/companies/${a.company_id}`}
                    className="text-lg font-medium text-indigo-300 hover:text-indigo-200"
                  >
                    {a.name}
                    {a.ticker ? ` (${a.ticker})` : ''}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{a.sector}</p>
                </div>
                <PriorityBadge score={a.priority_score} />
              </div>
              <p className="mt-3 text-sm text-slate-300">{a.why_now}</p>
              <p className="mt-2 text-xs text-slate-500">
                Last contact:{' '}
                {a.last_contact
                  ? `${lastContactSummary(a.last_contact)} · ${formatWhen(a.last_contact.activity_timestamp)}`
                  : 'No prior contact'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {a.options?.map((opt) =>
                  opt.type === 'C' ? (
                    <button
                      key="C"
                      type="button"
                      onClick={() =>
                        setDraftModal({
                          companyId: a.company_id,
                          companyName: a.name,
                          lastContactIso: lastContactIsoForAction(a),
                          outreachAttemptCount: a.outreach_attempt_count ?? 0,
                          initialIntent: '',
                          initialSpecificNotes:
                            customIntent[a.company_id]?.trim() || '',
                        })
                      }
                      className="rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      {opt.type}: {opt.label}
                    </button>
                  ) : (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() =>
                        setDraftModal({
                          companyId: a.company_id,
                          companyName: a.name,
                          lastContactIso: lastContactIsoForAction(a),
                          outreachAttemptCount: a.outreach_attempt_count ?? 0,
                          initialIntent: outreachIntentForActionCard(a),
                        })
                      }
                      className="rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      {opt.type}: {opt.label}
                    </button>
                  )
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-400">
                  Option C — write your own intent
                </p>
                <input
                  type="text"
                  placeholder="Your approach"
                  value={customIntent[a.company_id] || ''}
                  onChange={(e) =>
                    setCustomIntent((m) => ({
                      ...m,
                      [a.company_id]: e.target.value,
                    }))
                  }
                  className="mt-1 w-full max-w-md rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-sm text-white"
                />
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                {snoozeFor === a.company_id ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-xs text-slate-400">
                      Snooze until
                      <input
                        type="date"
                        min={minSnoozeDate()}
                        value={snoozeDate}
                        onChange={(e) => setSnoozeDate(e.target.value)}
                        className="ml-2 rounded border border-white/10 bg-slate-950 px-2 py-1 text-sm text-white"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={snoozeBusy || !snoozeDate}
                      onClick={() => confirmSnooze(a.company_id)}
                      className="rounded-lg bg-slate-600 px-3 py-1 text-sm text-white hover:bg-slate-500 disabled:opacity-40"
                    >
                      Confirm snooze
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSnoozeFor(null);
                        setSnoozeDate('');
                      }}
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSnoozeFor(a.company_id);
                      setSnoozeDate('');
                    }}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5"
                  >
                    Snooze
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 2 */}
      <section>
        <h2 className="text-xl font-semibold text-white">
          Relationships going cold
        </h2>
        {staleErr && (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-500/30">
            {staleErr}
          </p>
        )}
        {!staleErr && stale.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">None right now.</p>
        )}
        <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
          {stale.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <Link
                to={`/companies/${c.id}`}
                className="font-medium text-indigo-300 hover:text-indigo-200"
              >
                {c.name}
              </Link>
              <span className="text-sm text-slate-500">
                {c.last_interaction
                  ? `Last: ${formatWhen(c.last_interaction)}`
                  : 'Never contacted'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 3 */}
      <section>
        <h2 className="text-xl font-semibold text-white">Recent activity</h2>
        {feedErr && (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-500/30">
            {feedErr}
          </p>
        )}
        {!feedErr && feed.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No outreach logged yet.</p>
        )}
        <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
          {feed.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <span className="text-slate-500">
                {formatWhen(row.activity_timestamp)}
              </span>
              <span className="ml-2 text-white">
                {row.banker_name || row.banker_email || 'Banker'}
              </span>
              <span className="text-slate-500"> · {row.activity_type}</span>
              <span className="ml-1 text-slate-300">{row.company_name}</span>
              {row.subject && (
                <span className="block truncate text-xs text-slate-500">
                  {row.subject}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Section 4 */}
      <section>
        <h2 className="text-xl font-semibold text-white">Active deals</h2>
        <p className="mt-2 rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-4 py-6 text-sm text-slate-500">
          Deal tracking live in Phase 2
        </p>
      </section>

      {/* Section 5 */}
      <section>
        <h2 className="text-xl font-semibold text-white">Morning triggers</h2>
        <p className="mt-2 rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-4 py-6 text-sm text-slate-500">
          Live trigger feed active in Phase 3
        </p>
      </section>
    </div>
  );
}
