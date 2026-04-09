import { buildWhyNowRationale } from './whyNow.js';

const LIMIT = 20;

/** @param {import('pg').Pool} pool */
export async function applyMonitoringEscalations(pool) {
  await pool.query(
    `UPDATE companies SET
      cadence_status = 'monitoring',
      coverage_status = 'Monitoring',
      cadence_note = CASE
        WHEN cadence_note IS NULL OR cadence_note = '' THEN '3 touches, no response'
        WHEN cadence_note LIKE '%3 touches, no response%' THEN cadence_note
        ELSE cadence_note || E'\n3 touches, no response'
      END,
      updated_at = now()
    WHERE cadence_status = 'active'
      AND outreach_attempt_count >= 3
      AND last_outreach_date IS NOT NULL
      AND last_outreach_date <= NOW() - INTERVAL '30 days'`
  );
}

/** Wake snoozed companies when snooze date has passed. */
export async function wakeSnoozedCompanies(pool) {
  await pool.query(
    `UPDATE companies SET
      cadence_status = 'active',
      snooze_until_date = NULL,
      updated_at = now()
    WHERE cadence_status = 'snoozed'
      AND snooze_until_date IS NOT NULL
      AND snooze_until_date <= now()`
  );
}

/** Daily maintenance: snooze wake + 3-touch escalation. */
export async function runDailyCadenceMaintenance(pool) {
  await wakeSnoozedCompanies(pool);
  await applyMonitoringEscalations(pool);
}

function daysBetween(fromDate, toDate = new Date()) {
  if (!fromDate) return null;
  const a = new Date(fromDate).getTime();
  const b = toDate.getTime();
  return (b - a) / (1000 * 60 * 60 * 24);
}

/**
 * Whether company passes outreach cadence windows (§7 Daily Action Engine).
 * @param {object} row — company row
 */
export function passesCadenceWindow(row) {
  const count = row.outreach_attempt_count ?? 0;
  const last = row.last_outreach_date;
  const days = daysBetween(last);

  if (count === 0) {
    const ps = row.priority_score ?? 0;
    return ps > 0;
  }
  if (count === 1) return days != null && days >= 7;
  if (count === 2) return days != null && days >= 14;
  if (count >= 3) {
    return false;
  }
  return false;
}

function buildActionOptions(row, whyNow) {
  const count = row.outreach_attempt_count ?? 0;
  const idleDays = daysBetween(row.last_interaction);
  const longIdle = idleDays != null && idleDays >= 180;

  if (count > 0 && longIdle) {
    return [
      {
        type: 'A',
        label: 'Re-engagement email',
        description:
          'Re-engagement email referencing recent trigger or company context.',
      },
      {
        type: 'B',
        label: 'Call before emailing',
        description: 'Call before emailing to re-open the dialogue.',
      },
      {
        type: 'C',
        label: 'Custom',
        description: 'Write your own approach',
      },
    ];
  }

  if (count === 0) {
    return [
      {
        type: 'A',
        label: 'Intro email',
        description: `Intro email aligned with current context — ${whyNow.slice(0, 80)}${whyNow.length > 80 ? '…' : ''}`,
      },
      {
        type: 'B',
        label: 'Cold call first',
        description: 'Cold call first, email to follow.',
      },
      {
        type: 'C',
        label: 'Custom',
        description: 'Write your own approach',
      },
    ];
  }
  return [
    {
      type: 'A',
      label: 'Follow-up email',
      description: `Follow-up email referencing prior outreach — ${whyNow.slice(0, 60)}${whyNow.length > 60 ? '…' : ''}`,
    },
    {
      type: 'B',
      label: 'Try a different contact',
      description: 'Try a different contact at the company.',
    },
    {
      type: 'C',
      label: 'Custom',
      description: 'Write your own approach',
    },
  ];
}

/**
 * @param {import('pg').Pool} pool
 */
export async function getDashboardActionList(pool) {
  await applyMonitoringEscalations(pool);

  const { rows: candidates } = await pool.query(
    `SELECT c.*
     FROM companies c
     WHERE c.cadence_status = 'active'
       AND (c.coverage_status IS NULL OR c.coverage_status != 'Inactive')
       AND NOT EXISTS (
         SELECT 1 FROM deals d
         WHERE d.company_id = c.id
           AND d.stage IS NOT NULL
           AND trim(d.stage) IN ('Mandate', 'Execution')
       )`
  );

  const eligible = [];
  for (const row of candidates) {
    if (passesCadenceWindow(row)) {
      eligible.push(row);
    }
  }

  eligible.sort((a, b) => {
    const pa = a.priority_score ?? 0;
    const pb = b.priority_score ?? 0;
    return pb - pa;
  });

  const top = eligible.slice(0, LIMIT);
  if (top.length === 0) return [];

  const ids = top.map((r) => r.id);
  const { rows: lastTouches } = await pool.query(
    `SELECT DISTINCT ON (company_id)
       company_id, id, activity_type, activity_timestamp, subject, body,
       banker_id, contact_id
     FROM outreach_activity
     WHERE company_id = ANY($1::uuid[])
     ORDER BY company_id, activity_timestamp DESC NULLS LAST`,
    [ids]
  );
  const lastByCo = Object.fromEntries(lastTouches.map((o) => [o.company_id, o]));

  return top.map((row) => {
    const why_now = buildWhyNowRationale(row);
    const last = lastByCo[row.id] || null;
    return {
      company_id: row.id,
      name: row.name,
      ticker: row.ticker,
      sector: row.sector,
      priority_score: row.priority_score,
      priority_score_breakdown: row.priority_score_breakdown,
      coverage_status: row.coverage_status,
      cadence_status: row.cadence_status,
      outreach_attempt_count: row.outreach_attempt_count,
      last_outreach_date: row.last_outreach_date,
      why_now,
      last_contact: last,
      options: buildActionOptions(row, why_now),
    };
  });
}
