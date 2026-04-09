/**
 * Priority scoring (0–100 composite from five 0–20 categories + optional banker boost).
 * Mock data is deterministic per company id. For Phase 3, replace fetchCategoryScoresMock
 * with a FactSet/CapIQ-backed fetch returning the same shape; keep assemblePriorityScore unchanged.
 */

const CATEGORY_KEYS = [
  'capital_need_urgency',
  'market_opportunity',
  'business_momentum',
  'trigger_events',
  'strategic_inflection',
];

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @returns {Record<string, number>} each value 0–20 */
export function fetchCategoryScoresMock(companyId) {
  const out = {};
  for (const key of CATEGORY_KEYS) {
    const seed = hash32(`${companyId}:${key}`);
    const rand = mulberry32(seed);
    out[key] = Math.min(20, Math.floor(rand() * 21));
  }
  return out;
}

/**
 * @param {boolean} bankerFlag
 * @param {Record<string, number>} categoryScores — five keys, 0–20 each
 * @returns {{ priority_score: number, priority_score_breakdown: object }}
 */
export function assemblePriorityScore(bankerFlag, categoryScores, calculatedAt = new Date()) {
  let sum = 0;
  for (const key of CATEGORY_KEYS) {
    const v = categoryScores[key] ?? 0;
    sum += Math.max(0, Math.min(20, v));
  }
  const banker_flag_boost = bankerFlag ? 15 : 0;
  const rawComposite = sum + banker_flag_boost;
  const priority_score = Math.max(0, Math.min(100, rawComposite));

  const priority_score_breakdown = {
    capital_need_urgency: categoryScores.capital_need_urgency ?? 0,
    market_opportunity: categoryScores.market_opportunity ?? 0,
    business_momentum: categoryScores.business_momentum ?? 0,
    trigger_events: categoryScores.trigger_events ?? 0,
    strategic_inflection: categoryScores.strategic_inflection ?? 0,
    banker_flag_boost,
    calculated_at: calculatedAt.toISOString(),
    data_mode: 'mock',
  };

  return { priority_score, priority_score_breakdown };
}

/**
 * @param {object} companyRow — must include id, banker_flag
 */
export function computePriorityScoreForCompany(companyRow) {
  const categories = fetchCategoryScoresMock(String(companyRow.id));
  return assemblePriorityScore(Boolean(companyRow.banker_flag), categories);
}

/**
 * Recompute and persist all companies (sequential).
 * @param {import('pg').Pool} pool
 * @returns {Promise<number>} number of rows updated
 */
export async function recalculateAllCompanyScores(pool) {
  const { rows } = await pool.query(
    'SELECT * FROM companies ORDER BY id ASC'
  );
  let count = 0;
  for (const row of rows) {
    const { priority_score, priority_score_breakdown } =
      computePriorityScoreForCompany(row);
    await pool.query(
      `UPDATE companies SET
        priority_score = $1,
        priority_score_breakdown = $2,
        updated_at = now()
      WHERE id = $3`,
      [priority_score, priority_score_breakdown, row.id]
    );
    count += 1;
  }
  return count;
}
