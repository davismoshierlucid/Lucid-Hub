import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { attachDbUser } from '../middleware/attachDbUser.js';
import { computeDataHealth } from '../services/dataHealth.js';
import { computePriorityScoreForCompany } from '../services/priorityScore.js';
import { getPagination, isUuid } from '../utils/pagination.js';

const router = Router();

router.use(requireAuth);
router.use(requireDatabase);

const SORT_COLUMNS = {
  priority_score: 'priority_score',
  name: 'name',
  coverage_status: 'coverage_status',
};

const ALLOWED_UPDATE_FIELDS = new Set([
  'name',
  'ticker',
  'exchange',
  'sector',
  'sub_sector',
  'market_cap_band',
  'coverage_status',
  'origination_status',
  'situation_type',
  'angle_scores',
  'last_interaction',
  'last_news_reviewed_at',
]);

async function getContactCount(pool, companyId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS c FROM contacts WHERE company_id = $1',
    [companyId]
  );
  return rows[0]?.c ?? 0;
}

function mergeCompanyRow(existing, patch) {
  return { ...existing, ...patch };
}

router.get('/companies', async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = getPagination(req.query);
    const sortKey = SORT_COLUMNS[req.query.sort] || 'priority_score';
    const order =
      String(req.query.order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let i = 1;

    if (req.query.coverage_status) {
      conditions.push(`coverage_status = $${i++}`);
      params.push(req.query.coverage_status);
    }
    if (req.query.sector) {
      conditions.push(`sector = $${i++}`);
      params.push(req.query.sector);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderSql = `${sortKey} ${order}`;
    if (sortKey === 'priority_score' && order === 'DESC') {
      orderSql += ' NULLS LAST';
    }

    const countSql = `SELECT COUNT(*)::int AS total FROM companies ${where}`;
    const listSql = `
      SELECT *
      FROM companies
      ${where}
      ORDER BY ${orderSql}, id ASC
      LIMIT $${i} OFFSET $${i + 1}
    `;
    params.push(limit, offset);

    const [{ rows: countRows }, { rows }] = await Promise.all([
      pool.query(countSql, params.slice(0, i - 1)),
      pool.query(listSql, params),
    ]);

    const total = countRows[0]?.total ?? 0;
    res.json({
      data: rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/companies/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Invalid company id' });
      return;
    }
    const pool = getPool();
    const { rows: companyRows } = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [req.params.id]
    );
    if (!companyRows.length) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const company = companyRows[0];

    const [
      { rows: contacts },
      { rows: recent_outreach },
      { rows: open_deal_tasks },
    ] = await Promise.all([
      pool.query(
        `SELECT id, company_id, first_name, last_name, email, title, phone,
                relationship_owner_id, created_at, updated_at
         FROM contacts WHERE company_id = $1
         ORDER BY last_name ASC NULLS LAST, first_name ASC NULLS LAST`,
        [company.id]
      ),
      pool.query(
        `SELECT o.*, u.email AS banker_email, u.display_name AS banker_name
         FROM outreach_activity o
         LEFT JOIN users u ON u.id = o.banker_id
         WHERE o.company_id = $1
         ORDER BY o.activity_timestamp DESC
         LIMIT 10`,
        [company.id]
      ),
      pool.query(
        `SELECT dt.*, d.deal_type, d.stage AS deal_stage, d.id AS deal_id
         FROM deal_tasks dt
         INNER JOIN deals d ON d.id = dt.deal_id
         WHERE d.company_id = $1 AND dt.completed = false
         ORDER BY dt.due_date NULLS LAST, dt.sort_order, dt.created_at`,
        [company.id]
      ),
    ]);

    const contactCount = contacts.length;
    const { score, breakdown } = computeDataHealth(company, { contactCount });

    res.json({
      company,
      data_health: { score, breakdown },
      contacts,
      recent_outreach,
      open_deal_tasks,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/companies', async (req, res, next) => {
  try {
    const pool = getPool();
    const b = req.body || {};
    const required = [
      'name',
      'coverage_status',
      'sector',
      'situation_type',
      'origination_status',
    ];
    const missing = required.filter(
      (k) => b[k] == null || String(b[k]).trim() === ''
    );
    if (missing.length) {
      res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
      return;
    }

    const insert = {
      name: String(b.name).trim(),
      ticker: b.ticker ?? null,
      exchange: b.exchange ?? null,
      sector: String(b.sector).trim(),
      sub_sector: b.sub_sector ?? null,
      market_cap_band: b.market_cap_band ?? null,
      coverage_status: String(b.coverage_status).trim(),
      origination_status: String(b.origination_status).trim(),
      situation_type: String(b.situation_type).trim(),
      priority_score: 0,
      angle_scores: b.angle_scores ?? null,
      last_interaction: b.last_interaction ?? null,
      last_news_reviewed_at: b.last_news_reviewed_at ?? null,
    };

    const { score: data_health_score } = computeDataHealth(insert, {
      contactCount: 0,
    });

    const { rows } = await pool.query(
      `INSERT INTO companies (
        name, ticker, exchange, sector, sub_sector, market_cap_band,
        coverage_status, origination_status, situation_type,
        priority_score, angle_scores, last_interaction, last_news_reviewed_at,
        data_health_score
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      ) RETURNING *`,
      [
        insert.name,
        insert.ticker,
        insert.exchange,
        insert.sector,
        insert.sub_sector,
        insert.market_cap_band,
        insert.coverage_status,
        insert.origination_status,
        insert.situation_type,
        insert.priority_score,
        insert.angle_scores,
        insert.last_interaction,
        insert.last_news_reviewed_at,
        data_health_score,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/companies/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Invalid company id' });
      return;
    }
    const pool = getPool();
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [req.params.id]
    );
    if (!existingRows.length) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const existing = existingRows[0];
    const patch = {};
    for (const key of Object.keys(req.body || {})) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        patch[key] = req.body[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const merged = mergeCompanyRow(existing, patch);
    const contactCount = await getContactCount(pool, req.params.id);
    const { score: data_health_score } = computeDataHealth(merged, {
      contactCount,
    });

    const keys = Object.keys(patch);
    const sets = keys.map((k, idx) => `${k} = $${idx + 1}`);
    const values = keys.map((k) => patch[k]);
    values.push(data_health_score);
    values.push(req.params.id);

    const sql = `
      UPDATE companies SET
        ${sets.join(', ')},
        data_health_score = $${keys.length + 1},
        updated_at = now()
      WHERE id = $${keys.length + 2}
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/companies/:id/flag',
  attachDbUser,
  async (req, res, next) => {
    try {
      if (!isUuid(req.params.id)) {
        res.status(400).json({ error: 'Invalid company id' });
        return;
      }
      const reason = req.body?.banker_flag_reason;
      if (reason == null || String(reason).trim() === '') {
        res.status(400).json({
          error: 'banker_flag_reason is required and cannot be empty',
        });
        return;
      }

      const pool = getPool();
      const contactCount = await getContactCount(pool, req.params.id);
      const { rows: curRows } = await pool.query(
        'SELECT * FROM companies WHERE id = $1',
        [req.params.id]
      );
      if (!curRows.length) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }
      const merged = {
        ...curRows[0],
        banker_flag: true,
        banker_flag_reason: String(reason).trim(),
        banker_flag_set_by: req.dbUserId,
        banker_flag_set_at: new Date(),
      };
      const { score: data_health_score } = computeDataHealth(merged, {
        contactCount,
      });

      const { rows } = await pool.query(
        `UPDATE companies SET
          banker_flag = true,
          banker_flag_reason = $1,
          banker_flag_set_by = $2,
          banker_flag_set_at = now(),
          data_health_score = $3,
          updated_at = now()
        WHERE id = $4
        RETURNING *`,
        [String(reason).trim(), req.dbUserId, data_health_score, req.params.id]
      );
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/companies/:id/flag', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Invalid company id' });
      return;
    }
    const pool = getPool();
    const { rows: curRows } = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [req.params.id]
    );
    if (!curRows.length) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const contactCount = await getContactCount(pool, req.params.id);
    const merged = {
      ...curRows[0],
      banker_flag: false,
      banker_flag_reason: null,
      banker_flag_set_by: null,
      banker_flag_set_at: null,
    };
    const { score: data_health_score } = computeDataHealth(merged, {
      contactCount,
    });
    const prio = computePriorityScoreForCompany(merged);

    const { rows } = await pool.query(
      `UPDATE companies SET
        banker_flag = false,
        banker_flag_reason = NULL,
        banker_flag_set_by = NULL,
        banker_flag_set_at = NULL,
        data_health_score = $1,
        priority_score = $2,
        priority_score_breakdown = $3,
        updated_at = now()
      WHERE id = $4
      RETURNING *`,
      [
        data_health_score,
        prio.priority_score,
        prio.priority_score_breakdown,
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
