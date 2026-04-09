function tier(score) {
  if (score == null) return { label: '—', className: 'bg-slate-700 text-slate-300' };
  if (score >= 80)
    return { label: score, className: 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/40' };
  if (score >= 50)
    return { label: score, className: 'bg-amber-500/20 text-amber-100 ring-amber-500/40' };
  return { label: score, className: 'bg-red-500/20 text-red-200 ring-red-500/40' };
}

export function HealthBadge({ score }) {
  const { label, className } = tier(score);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      Health {label}
    </span>
  );
}

export function PriorityBadge({ score }) {
  const { label, className } = tier(score);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      Priority {label}
    </span>
  );
}
