import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { getPagination, isUuid } from '../utils/pagination.js';
import { computeDataHealth } from '../services/dataHealth.js';

const router = Router();

router.use(requireAuth);
router.use(requireDatabase);

const CONTACT_UPDATE_FIELDS = new Set([
  'first_name',
  'last_name',
  'email',
  'title',
  'phone',
  'relationship_owner_id',
]);

function splitName(fullName) {
  const parts = String(fullName).trim().split(/\s+/);
  const first_name = parts[0] || '';
  const last_name = parts.length > 1 ? parts.slice(1).join(' ') : null;
  return { first_name, last_name };
}

router.get('/contacts', async (req, res, next) => {
  try {
    const pool = getPool();
    const { page, limit, offset } = getPagination(req.query);
    const conditions = [];
    const params = [];
    let i = 1;

    if (req.query.company_id) {
      if (!isUuid(String(req.query.company_id))) {
        res.status(400).json({ error: 'Invalid company_id' });
        return;
      }
      conditions.push(`company_id = $${i++}`);
      params.push(req.query.company_id);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int AS total FROM contacts ${where}`;
    const listSql = `
      SELECT *
      FROM contacts
      ${where}
      ORDER BY last_name ASC NULLS LAST, first_name ASC NULLS LAST, id ASC
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

router.get('/contacts/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Invalid contact id' });
      return;
    }
    const pool = getPool();
    const { rows: contactRows } = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [req.params.id]
    );
    if (!contactRows.length) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    const contact = contactRows[0];

    const [{ rows: companyRows }, { rows: recent_outreach }] =
      await Promise.all([
        pool.query('SELECT * FROM companies WHERE id = $1', [
          contact.company_id,
        ]),
        pool.query(
          `SELECT o.*, u.email AS banker_email, u.display_name AS banker_name
           FROM outreach_activity o
           LEFT JOIN users u ON u.id = o.banker_id
           WHERE o.contact_id = $1
           ORDER BY o.activity_timestamp DESC
           LIMIT 10`,
          [contact.id]
        ),
      ]);

    res.json({
      contact,
      company: companyRows[0] || null,
      recent_outreach,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/contacts', async (req, res, next) => {
  try {
    const b = req.body || {};
    const company_id = b.company_id;
    const name = b.name;

    if (!company_id || !isUuid(String(company_id))) {
      res.status(400).json({ error: 'company_id is required and must be valid' });
      return;
    }
    if (name == null || String(name).trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const pool = getPool();
    const { rows: co } = await pool.query(
      'SELECT id FROM companies WHERE id = $1',
      [company_id]
    );
    if (!co.length) {
      res.status(400).json({ error: 'Company not found' });
      return;
    }

    const { first_name, last_name } = splitName(name);

    const { rows } = await pool.query(
      `INSERT INTO contacts (
        company_id, first_name, last_name, email, title, phone, relationship_owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        company_id,
        first_name,
        last_name,
        b.email ?? null,
        b.title ?? null,
        b.phone ?? null,
        b.relationship_owner_id ?? null,
      ]
    );

    const company = await pool.query('SELECT * FROM companies WHERE id = $1', [
      company_id,
    ]);
    const c = company.rows[0];
    if (c) {
      const { rows: cnt } = await pool.query(
        'SELECT COUNT(*)::int AS c FROM contacts WHERE company_id = $1',
        [company_id]
      );
      const contactCount = cnt[0].c;
      const { score } = computeDataHealth(c, { contactCount });
      await pool.query(
        'UPDATE companies SET data_health_score = $1, updated_at = now() WHERE id = $2',
        [score, company_id]
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/contacts/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Invalid contact id' });
      return;
    }
    const pool = getPool();
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [req.params.id]
    );
    if (!existingRows.length) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const patch = {};
    for (const key of Object.keys(req.body || {})) {
      if (CONTACT_UPDATE_FIELDS.has(key)) {
        patch[key] = req.body[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const keys = Object.keys(patch);
    const sets = keys.map((k, idx) => `${k} = $${idx + 1}`);
    const values = keys.map((k) => patch[k]);
    values.push(req.params.id);

    const sql = `
      UPDATE contacts SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    const { rows } = await pool.query(sql, values);
    const updated = rows[0];

    const company_id = updated.company_id;
    const { rows: coRows } = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [company_id]
    );
    if (coRows.length) {
      const { rows: cnt } = await pool.query(
        'SELECT COUNT(*)::int AS c FROM contacts WHERE company_id = $1',
        [company_id]
      );
      const { score } = computeDataHealth(coRows[0], { contactCount: cnt[0].c });
      await pool.query(
        'UPDATE companies SET data_health_score = $1, updated_at = now() WHERE id = $2',
        [score, company_id]
      );
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
