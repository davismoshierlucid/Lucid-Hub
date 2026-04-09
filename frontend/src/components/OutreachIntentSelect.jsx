export const OUTREACH_INTENTS = [
  {
    value: 'First introduction — no prior relationship',
    label: 'First introduction — no prior relationship',
  },
  {
    value: 'First introduction — warm (referral)',
    label: 'First introduction — warm (referral)',
  },
  {
    value: 'Follow-up on prior conversation',
    label: 'Follow-up on prior conversation',
  },
  {
    value: 'Re-engagement after gap (6+ months)',
    label: 'Re-engagement after gap (6+ months)',
  },
  {
    value: 'Specific trigger response',
    label: 'Specific trigger response',
  },
  {
    value: 'Active process update',
    label: 'Active process update',
  },
];

export function OutreachIntentSelect({ id, value, onChange, disabled }) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
    >
      <option value="">Select intent…</option>
      {OUTREACH_INTENTS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
