/**
 * Assembles four-layer outreach context (Sprint 5 / Claude.md).
 * @param {import('pg').Pool} pool
 * @param {string} companyId
 * @param {{
 *   outreach_intent: string,
 *   selected_credentials?: string[],
 *   selected_deals?: unknown[],
 *   custom_notes?: string,
 * }} inputs
 */
export async function assembleOutreachContext(pool, companyId, inputs) {
  const {
    outreach_intent,
    selected_credentials = [],
    selected_deals = [],
    custom_notes = '',
  } = inputs;

  const { rows: companies } = await pool.query(
    'SELECT * FROM companies WHERE id = $1',
    [companyId]
  );
  if (!companies.length) return null;

  const company = companies[0];

  const { rows: timeline } = await pool.query(
    `SELECT id, activity_type, subject, body, activity_timestamp,
            contact_id, banker_id
     FROM outreach_activity
     WHERE company_id = $1
     ORDER BY activity_timestamp DESC NULLS LAST
     LIMIT 10`,
    [companyId]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM outreach_activity
     WHERE company_id = $1`,
    [companyId]
  );
  const prior_outreach_attempt_count = countRows[0]?.c ?? 0;

  const recent = timeline[0] ?? null;
  const most_recent_touchpoint_summary = recent
    ? [recent.activity_type, recent.subject, recent.body?.slice(0, 280)]
        .filter(Boolean)
        .join(' — ')
    : null;

  const { rows: recentNews } = await pool.query(
    `SELECT *
     FROM news_items
     WHERE company_id = $1
     ORDER BY published_at DESC NULLS LAST, created_at DESC
     LIMIT 5`,
    [companyId]
  );

  const safeJson = (v) => (v == null ? null : v);

  return {
    relationship_history: {
      outreach_timeline: timeline,
      most_recent_touchpoint_summary,
      prior_outreach_attempt_count,
    },
    outreach_intent,
    company_context: {
      company,
      recent_news: recentNews,
      priority_score_breakdown: company.priority_score_breakdown ?? null,
      capiq_data: safeJson(company.capiq_data),
      factset_data: safeJson(company.factset_data),
    },
    lucid_positioning: {
      selected_credentials,
      selected_deals,
      custom_notes: custom_notes || '',
    },
  };
}
