const REQUIRED_FIELDS = [
  { key: 'coverage_status', label: 'Coverage status' },
  { key: 'sector', label: 'Sector' },
  { key: 'situation_type', label: 'Situation type' },
  { key: 'origination_status', label: 'Origination status' },
];

function isBlank(v) {
  return v == null || String(v).trim() === '';
}

/**
 * @param {object} company - row fields used for scoring
 * @param {{ contactCount: number, now?: Date }} ctx
 */
export function computeDataHealth(company, ctx) {
  const now = ctx.now ?? new Date();
  let score = 100;
  const breakdown = [];

  for (const { key, label } of REQUIRED_FIELDS) {
    if (isBlank(company[key])) {
      score -= 20;
      breakdown.push({
        code: `missing_${key}`,
        label: `${label} is required`,
        deduction: 20,
      });
    }
  }

  if (ctx.contactCount === 0) {
    score -= 20;
    breakdown.push({
      code: 'no_contacts',
      label: 'No contacts linked',
      deduction: 20,
    });
  }

  const cov = company.coverage_status;
  const isActive =
    cov != null && String(cov).trim().toLowerCase() === 'active';

  if (isActive) {
    const lastInt = company.last_interaction
      ? new Date(company.last_interaction)
      : null;
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const stale = !lastInt || lastInt < ninetyDaysAgo;
    if (stale) {
      score -= 15;
      breakdown.push({
        code: 'stale_activity',
        label: 'No activity logged in 90+ days (Active coverage)',
        deduction: 15,
      });
    }
  }

  const reviewed = company.last_news_reviewed_at
    ? new Date(company.last_news_reviewed_at)
    : null;
  const hundredTwentyAgo = new Date(
    now.getTime() - 120 * 24 * 60 * 60 * 1000
  );
  if (!reviewed || reviewed < hundredTwentyAgo) {
    score -= 10;
    breakdown.push({
      code: 'news_review',
      label: 'No news/triggers reviewed in 120+ days',
      deduction: 10,
    });
  }

  score = Math.max(0, Math.min(100, score));
  return { score, breakdown };
}
