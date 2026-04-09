/**
 * One-line why-now rationale from priority breakdown (mock semantics).
 * Phase 3: replace body with Claude / live narrative; keep export shape.
 */

const CATEGORY_KEYS = [
  'capital_need_urgency',
  'market_opportunity',
  'business_momentum',
  'trigger_events',
  'strategic_inflection',
];

const TEMPLATES = {
  capital_need_urgency: (name) =>
    `${name} shows near-term capital need signals — potential raise window open.`,
  business_momentum: (name) =>
    `${name} revenue trajectory and margin profile suggest an active growth phase.`,
  market_opportunity: (name) =>
    `Sector conditions favor ${name} for a capital markets transaction now.`,
  trigger_events: (name) =>
    `Recent material events at ${name} create an actionable outreach window.`,
  strategic_inflection: (name) =>
    `${name} shows strategic inflection signals that typically precede capital activity.`,
};

function topCategoryFromBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') return null;
  let bestKey = null;
  let bestVal = -1;
  for (const key of CATEGORY_KEYS) {
    const v = Number(breakdown[key]);
    if (!Number.isFinite(v)) continue;
    const clamped = Math.max(0, Math.min(20, v));
    if (clamped > bestVal) {
      bestVal = clamped;
      bestKey = key;
    }
  }
  return bestKey;
}

/**
 * @param {object} company — expects name, priority_score_breakdown
 * @returns {string}
 */
export function buildWhyNowRationale(company) {
  const name = company.name || 'Company';
  const top = topCategoryFromBreakdown(company.priority_score_breakdown);
  const key = top || 'market_opportunity';
  const fn = TEMPLATES[key] || TEMPLATES.market_opportunity;
  return fn(name);
}
