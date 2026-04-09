import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { attachDbUser } from '../middleware/attachDbUser.js';
import { isUuid } from '../utils/pagination.js';
import { assembleOutreachContext } from '../services/contextAssembler.js';
import { callHubClaude, isAnthropicConfigured } from '../services/claudeClient.js';

const router = Router();

router.use(requireAuth);
router.use(requireDatabase);

function requireAi(req, res, next) {
  if (!isAnthropicConfigured()) {
    res.status(503).json({ message: 'AI service not configured' });
    return;
  }
  next();
}

function parseJsonBlock(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not include JSON');
  }
  return JSON.parse(t.slice(start, end + 1));
}

router.post('/ai/draft-email', requireAi, async (req, res, next) => {
  try {
    const {
      company_id,
      outreach_intent,
      selected_credentials,
      selected_deals,
      custom_notes,
    } = req.body ?? {};

    if (!isUuid(company_id)) {
      res.status(400).json({ error: 'Invalid company_id' });
      return;
    }
    if (typeof outreach_intent !== 'string' || !outreach_intent.trim()) {
      res.status(400).json({ error: 'outreach_intent is required' });
      return;
    }
    if (!Array.isArray(selected_credentials)) {
      res.status(400).json({ error: 'selected_credentials must be an array' });
      return;
    }
    if (!Array.isArray(selected_deals)) {
      res.status(400).json({ error: 'selected_deals must be an array' });
      return;
    }

    const pool = getPool();
    const context_used = await assembleOutreachContext(pool, company_id, {
      outreach_intent: outreach_intent.trim(),
      selected_credentials,
      selected_deals,
      custom_notes: typeof custom_notes === 'string' ? custom_notes : '',
    });

    if (!context_used) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const userMessage = `You are drafting an outbound outreach email for Lucid Capital Markets.

Use the JSON context below. Obey the data integrity rules: do not invent financial figures, names, or events. If something is not in the context, keep the email appropriately general or note what you would need to personalize.

Context (JSON):
${JSON.stringify(context_used, null, 2)}

Write the full email: include a short Subject: line on the first line, then a blank line, then the email body. Match the outreach_intent. Reference Lucid positioning only using selected_credentials, selected_deals, and custom_notes — do not claim credentials that were not selected.`;

    const draft = await callHubClaude({
      userMessage,
      maxTokensKind: 'email',
    });

    res.json({ draft, context_used });
  } catch (err) {
    next(err);
  }
});

router.post('/ai/call-prep', requireAi, async (req, res, next) => {
  try {
    const { company_id } = req.body ?? {};
    if (!isUuid(company_id)) {
      res.status(400).json({ error: 'Invalid company_id' });
      return;
    }

    const pool = getPool();
    const context_used = await assembleOutreachContext(pool, company_id, {
      outreach_intent: 'Internal call preparation (no outbound email)',
      selected_credentials: [],
      selected_deals: [],
      custom_notes: '',
    });

    if (!context_used) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const userMessage = `Prepare a structured call briefing for a banker at Lucid Capital Markets about this company.

Context (JSON):
${JSON.stringify(context_used, null, 2)}

Respond with ONLY valid minified or pretty-printed JSON (no markdown fences) using exactly these keys and types:
{
  "situation_summary": "string",
  "talking_points": ["string", ...],
  "questions_to_ask": ["string", ...],
  "recent_context": "string summarizing recent news or triggers from context if any",
  "prior_conversation_context": "string — synthesize outreach_timeline and most_recent_touchpoint_summary; say none if empty"
}`;

    const raw = await callHubClaude({
      userMessage,
      maxTokensKind: 'callPrep',
    });
    const parsed = parseJsonBlock(raw);
    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

router.post('/ai/company-brief', requireAi, async (req, res, next) => {
  try {
    const { company_id } = req.body ?? {};
    if (!isUuid(company_id)) {
      res.status(400).json({ error: 'Invalid company_id' });
      return;
    }

    const pool = getPool();
    const context_used = await assembleOutreachContext(pool, company_id, {
      outreach_intent: 'Internal company brief (no outreach)',
      selected_credentials: [],
      selected_deals: [],
      custom_notes: '',
    });

    if (!context_used) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const userMessage = `Produce a concise company briefing for Lucid Capital Markets bankers.

Context (JSON):
${JSON.stringify(context_used, null, 2)}

Respond with ONLY valid JSON (no markdown fences) with exactly these string keys:
{
  "business_overview": "...",
  "capital_situation": "...",
  "origination_assessment": "...",
  "recent_triggers": "...",
  "suggested_approach": "..."
}

Use only facts present in the context. If data is missing, say what is missing rather than guessing.`;

    const raw = await callHubClaude({
      userMessage,
      maxTokensKind: 'brief',
    });
    const parsed = parseJsonBlock(raw);
    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

router.post('/ai/why-now', requireAi, async (req, res, next) => {
  try {
    const { company_id } = req.body ?? {};
    if (!isUuid(company_id)) {
      res.status(400).json({ error: 'Invalid company_id' });
      return;
    }

    const pool = getPool();
    const context_used = await assembleOutreachContext(pool, company_id, {
      outreach_intent: 'Why is this company actionable now?',
      selected_credentials: [],
      selected_deals: [],
      custom_notes: '',
    });

    if (!context_used) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const userMessage = `In one or two sentences only, explain why this company is a sensible origination target for an investment bank today. Ground your answer only in the JSON context. If context is thin, say so briefly.

Context:
${JSON.stringify(context_used, null, 2)}`;

    const why_now = await callHubClaude({
      userMessage,
      maxTokensKind: 'whyNow',
    });

    res.json({ why_now: why_now.trim() });
  } catch (err) {
    next(err);
  }
});

router.post('/ai/save-draft', attachDbUser, async (req, res, next) => {
  try {
    const { company_id, draft_type, content, deal_id } = req.body ?? {};

    if (!isUuid(company_id)) {
      res.status(400).json({ error: 'Invalid company_id' });
      return;
    }
    if (typeof draft_type !== 'string' || !draft_type.trim()) {
      res.status(400).json({ error: 'draft_type is required' });
      return;
    }
    if (typeof content !== 'string') {
      res.status(400).json({ error: 'content is required' });
      return;
    }
    if (deal_id != null && deal_id !== '' && !isUuid(deal_id)) {
      res.status(400).json({ error: 'Invalid deal_id' });
      return;
    }

    const pool = getPool();
    const subject = `AI draft: ${draft_type.trim()}`;

    const { rows } = await pool.query(
      `INSERT INTO outreach_activity (
        company_id,
        banker_id,
        activity_type,
        subject,
        body,
        deal_id,
        activity_timestamp
      ) VALUES ($1, $2, 'ai_draft', $3, $4, $5, now())
      RETURNING *`,
      [
        company_id,
        req.dbUserId,
        subject,
        content,
        deal_id && isUuid(deal_id) ? deal_id : null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
