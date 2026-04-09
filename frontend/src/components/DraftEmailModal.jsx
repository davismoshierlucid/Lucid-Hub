import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { formatAiError } from '../utils/aiError.js';
import { OutreachIntentSelect } from './OutreachIntentSelect.jsx';
import { CredentialSelector, initialCredentialState } from './CredentialSelector.jsx';

function formatLastContact(iso) {
  if (!iso) return 'None';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return 'None';
  }
}

export function DraftEmailModal({
  open,
  onClose,
  companyId,
  companyName,
  lastContactIso,
  outreachAttemptCount,
  initialIntent,
  initialSpecificNotes,
  onSaved,
}) {
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState('');
  const [cred, setCred] = useState(initialCredentialState);
  const [specificNotes, setSpecificNotes] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setIntent(initialIntent ?? '');
    setCred(initialCredentialState());
    setSpecificNotes(initialSpecificNotes?.trim() ? initialSpecificNotes : '');
    setDraft('');
    setErr(null);
    setLoading(false);
    setSaveBusy(false);
  }, [open, initialIntent, initialSpecificNotes, companyId]);

  if (!open) return null;

  async function runDraft() {
    setLoading(true);
    setErr(null);
    const custom_notes = specificNotes.trim();
    const writeIn = cred.writeIn?.trim();
    const selected_credentials = [
      ...cred.selected_credentials,
      ...(writeIn ? [writeIn] : []),
    ];
    try {
      const { data } = await api.post('/api/ai/draft-email', {
        company_id: companyId,
        outreach_intent: intent,
        selected_credentials,
        selected_deals: cred.selected_deals,
        custom_notes,
      });
      setDraft(data.draft ?? '');
      setStep(3);
    } catch (e) {
      setErr(formatAiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    setSaveBusy(true);
    setErr(null);
    try {
      await api.post('/api/ai/save-draft', {
        company_id: companyId,
        draft_type: 'email_outreach',
        content: draft,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(formatAiError(e));
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-6 shadow-xl">
        <div className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-400">
          <p>
            <span className="text-slate-500">Company: </span>
            <span className="text-slate-200">{companyName}</span>
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Last contact: </span>
            {formatLastContact(lastContactIso)}
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Outreach attempts: </span>
            {outreachAttemptCount ?? 0}
          </p>
        </div>

        {step === 1 && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-white">
              What is the purpose of this outreach?
            </h2>
            <OutreachIntentSelect
              id="draft-intent"
              value={intent}
              onChange={setIntent}
              disabled={loading}
            />
            {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!intent}
                onClick={() => setStep(2)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-white">
              What should we reference about Lucid?
            </h2>
            <CredentialSelector
              value={cred}
              onChange={setCred}
              disabled={loading}
            />
            <label className="mt-4 block text-sm">
              <span className="text-slate-400">Anything specific to include?</span>
              <textarea
                value={specificNotes}
                disabled={loading}
                onChange={(e) => setSpecificNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                placeholder="Optional"
              />
            </label>
            {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
            <div className="mt-6 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={runDraft}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Drafting…' : 'Generate draft'}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="mt-6 text-lg font-semibold text-white">
              Review your draft
            </h2>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={14}
              className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
            />
            {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saveBusy || !draft.trim()}
                onClick={saveDraft}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {saveBusy ? 'Saving…' : 'Save to record'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
