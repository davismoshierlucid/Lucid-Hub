import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const empty = {
  name: '',
  ticker: '',
  exchange: '',
  sector: '',
  sub_sector: '',
  market_cap_band: '',
  coverage_status: 'Active',
  origination_status: 'Early',
  situation_type: '',
};

export function AddCompanyModal({ open, onClose, onCreated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const { data } = await api.post('/api/companies', {
        name: form.name,
        ticker: form.ticker || null,
        exchange: form.exchange || null,
        sector: form.sector,
        sub_sector: form.sub_sector || null,
        market_cap_band: form.market_cap_band || null,
        coverage_status: form.coverage_status,
        origination_status: form.origination_status,
        situation_type: form.situation_type,
      });
      try {
        await api.post(`/api/companies/${data.id}/recalculate-score`);
      } catch {
        /* score can be refreshed manually if this fails */
      }
      setForm(empty);
      onCreated?.();
      navigate(`/companies/${data.id}`);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">Add company</h2>
        <p className="mt-1 text-sm text-slate-400">
          Required: name, sector, coverage, situation, and origination status.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {[
            ['name', 'Company name', 'text', true],
            ['ticker', 'Ticker', 'text', false],
            ['exchange', 'Exchange', 'text', false],
            ['sector', 'Sector', 'text', true],
            ['sub_sector', 'Sub-sector', 'text', false],
            ['market_cap_band', 'Market cap band', 'text', false],
            ['situation_type', 'Situation type', 'text', true],
          ].map(([key, label, type, required]) => (
            <label key={key} className="block text-sm">
              <span className="text-slate-400">{label}</span>
              <input
                type={type}
                required={required}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="text-slate-400">Coverage status</span>
            <select
              required
              value={form.coverage_status}
              onChange={(e) => set('coverage_status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="Active">Active</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Origination status</span>
            <select
              required
              value={form.origination_status}
              onChange={(e) => set('origination_status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="Early">Early</option>
              <option value="Engaged">Engaged</option>
              <option value="Active Process">Active Process</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
          {err && (
            <p className="text-sm text-red-300">{err}</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
