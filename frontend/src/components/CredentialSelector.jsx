const DEAL_CHOICES = [
  { key: 'recent_deal_1', dealLabel: 'Recent deal 1 (placeholder for now)' },
  { key: 'recent_deal_2', dealLabel: 'Recent deal 2 (placeholder for now)' },
];

const CRED_CHOICES = [
  { key: 'sector_expertise', label: 'Sector expertise' },
  {
    key: 'investor_access',
    label: 'Investor access — quality fundamental investors',
  },
  { key: 'cross_border', label: 'Cross-border capability' },
  { key: 'advisory_track', label: 'Advisory track record' },
];

function buildPayload(dealKeys, credKeys, writeIn) {
  const dealKeySet = new Set(dealKeys);
  const credKeySet = new Set(credKeys);
  return {
    dealKeys,
    credKeys,
    writeIn,
    selected_deals: DEAL_CHOICES.filter((d) => dealKeySet.has(d.key)).map(
      (d) => d.dealLabel
    ),
    selected_credentials: CRED_CHOICES.filter((c) => credKeySet.has(c.key)).map(
      (c) => c.label
    ),
  };
}

export function initialCredentialState() {
  return buildPayload([], [], '');
}

export function CredentialSelector({ value, onChange, disabled }) {
  const { dealKeys, credKeys, writeIn } =
    value ?? initialCredentialState();

  function emit(dealK, credK, win) {
    onChange(buildPayload(dealK, credK, win));
  }

  function toggleDeal(key) {
    const next = dealKeys.includes(key)
      ? dealKeys.filter((k) => k !== key)
      : [...dealKeys, key];
    emit(next, credKeys, writeIn);
  }

  function toggleCred(key) {
    const next = credKeys.includes(key)
      ? credKeys.filter((k) => k !== key)
      : [...credKeys, key];
    emit(dealKeys, next, writeIn);
  }

  const selectedDeals = buildPayload(dealKeys, credKeys, writeIn).selected_deals;
  const selectedCreds = buildPayload(dealKeys, credKeys, writeIn)
    .selected_credentials;

  return (
    <div className="space-y-4 text-sm">
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-xs font-medium text-slate-400">
          Reference deals (placeholders)
        </legend>
        {DEAL_CHOICES.map((d) => (
          <label
            key={d.key}
            className="flex cursor-pointer items-start gap-2 text-slate-200"
          >
            <input
              type="checkbox"
              className="mt-1 rounded border-white/20 bg-slate-950"
              checked={dealKeys.includes(d.key)}
              onChange={() => toggleDeal(d.key)}
            />
            <span>{d.dealLabel}</span>
          </label>
        ))}
      </fieldset>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-xs font-medium text-slate-400">
          Credentials
        </legend>
        {CRED_CHOICES.map((c) => (
          <label
            key={c.key}
            className="flex cursor-pointer items-start gap-2 text-slate-200"
          >
            <input
              type="checkbox"
              className="mt-1 rounded border-white/20 bg-slate-950"
              checked={credKeys.includes(c.key)}
              onChange={() => toggleCred(c.key)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="block">
        <span className="text-xs font-medium text-slate-400">
          Write in your own
        </span>
        <input
          type="text"
          value={writeIn}
          disabled={disabled}
          onChange={(e) => emit(dealKeys, credKeys, e.target.value)}
          placeholder="Optional credential or angle"
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
        />
      </label>

      <p className="text-xs text-slate-500">
        Selected for API: {selectedCreds.length + selectedDeals.length} items
        {writeIn.trim() ? ' + write-in' : ''}
      </p>
    </div>
  );
}
