import { Router } from 'express';
import { getPool } from '../config/db.js';
import { verifyIdToken } from '../middleware/requireAuth.js';

const router = Router();

function cognitoConfigured() {
  return Boolean(
    process.env.COGNITO_REGION &&
      process.env.COGNITO_USER_POOL_ID &&
      process.env.COGNITO_CLIENT_ID &&
      process.env.COGNITO_HOSTED_UI_DOMAIN &&
      process.env.COGNITO_REDIRECT_URI
  );
}

function tokenEndpoint() {
  const domain = process.env.COGNITO_HOSTED_UI_DOMAIN.replace(/^https?:\/\//, '');
  return `https://${domain}/oauth2/token`;
}

const ID_COOKIE = 'hub_id_token';
const ACCESS_COOKIE = 'hub_access_token';
const REFRESH_COOKIE = 'hub_refresh_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge, path = '/') {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge,
    path,
  };
}

/**
 * Redirect browser to Cognito Hosted UI (federated Microsoft / Azure AD).
 */
router.get('/login', (req, res) => {
  const frontend = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  if (!cognitoConfigured()) {
    res.redirect(`${frontend}/login?error=cognito_not_configured`);
    return;
  }

  const domain = process.env.COGNITO_HOSTED_UI_DOMAIN.replace(/^https?:\/\//, '');
  const base = `https://${domain}/oauth2/authorize`;
  const params = new URLSearchParams({
    client_id: process.env.COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile offline_access',
    redirect_uri: process.env.COGNITO_REDIRECT_URI,
  });
  const idp = process.env.COGNITO_IDENTITY_PROVIDER;
  if (idp) {
    params.set('identity_provider', idp);
  }

  res.redirect(`${base}?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const frontend = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const code = req.query.code;
  const oauthError = req.query.error;

  if (oauthError) {
    res.redirect(`${frontend}/login?error=${encodeURIComponent(String(oauthError))}`);
    return;
  }
  if (!code || typeof code !== 'string') {
    res.redirect(`${frontend}/login?error=missing_code`);
    return;
  }
  if (!cognitoConfigured()) {
    res.redirect(`${frontend}/login?error=cognito_not_configured`);
    return;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.COGNITO_CLIENT_ID,
    code,
    redirect_uri: process.env.COGNITO_REDIRECT_URI,
  });
  if (process.env.COGNITO_CLIENT_SECRET) {
    body.set('client_secret', process.env.COGNITO_CLIENT_SECRET);
  }

  let tokenRes;
  try {
    tokenRes = await fetch(tokenEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (e) {
    console.error('[auth] Token exchange request failed:', e.message);
    res.redirect(`${frontend}/login?error=token_exchange_failed`);
    return;
  }

  const raw = await tokenRes.text();
  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch {
    console.error('[auth] Token response not JSON:', raw.slice(0, 200));
    res.redirect(`${frontend}/login?error=invalid_token_response`);
    return;
  }

  if (!tokenRes.ok) {
    console.error('[auth] Token endpoint error:', tokenRes.status, raw.slice(0, 300));
    res.redirect(`${frontend}/login?error=token_denied`);
    return;
  }

  const { id_token, access_token, refresh_token, expires_in } = tokens;
  if (!id_token) {
    res.redirect(`${frontend}/login?error=no_id_token`);
    return;
  }

  try {
    await verifyIdToken(id_token);
  } catch (e) {
    console.error('[auth] ID token verification failed:', e.message);
    res.redirect(`${frontend}/login?error=invalid_id_token`);
    return;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64url').toString('utf8')
    );
    const sub = payload.sub;
    const email = payload.email || null;
    const displayName = payload.name || null;
    const pool = getPool();
    if (sub && pool) {
      await pool.query(
        `INSERT INTO users (cognito_sub, email, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (cognito_sub) DO UPDATE SET
           email = COALESCE(EXCLUDED.email, users.email),
           display_name = COALESCE(EXCLUDED.display_name, users.display_name),
           updated_at = now()`,
        [sub, email, displayName]
      );
    }
  } catch (e) {
    if (e.code === '42P01') {
      console.warn('[auth] users table missing — run npm run migrate');
    } else {
      console.error('[auth] User upsert failed:', e.message);
    }
  }

  const idMaxAge = SEVEN_DAYS_MS;
  const accessMaxAge = expires_in ? expires_in * 1000 : SEVEN_DAYS_MS;

  res.cookie(ID_COOKIE, id_token, cookieOptions(idMaxAge));
  if (access_token) {
    res.cookie(ACCESS_COOKIE, access_token, cookieOptions(accessMaxAge));
  }
  if (refresh_token) {
    res.cookie(REFRESH_COOKIE, refresh_token, cookieOptions(THIRTY_DAYS_MS, '/api/auth'));
  }

  res.redirect(`${frontend}/dashboard`);
});

router.post('/refresh', async (req, res) => {
  const refresh = req.cookies?.[REFRESH_COOKIE];
  if (!refresh) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }
  if (!cognitoConfigured()) {
    res.status(503).json({ error: 'Refresh is not configured' });
    return;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.COGNITO_CLIENT_ID,
    refresh_token: refresh,
  });
  if (process.env.COGNITO_CLIENT_SECRET) {
    body.set('client_secret', process.env.COGNITO_CLIENT_SECRET);
  }

  const tokenRes = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const raw = await tokenRes.text();
  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch {
    res.status(502).json({ error: 'Invalid token response' });
    return;
  }
  if (!tokenRes.ok) {
    res.status(401).json({ error: tokens.error_description || 'Refresh failed' });
    return;
  }

  const { id_token, access_token, expires_in } = tokens;
  if (id_token) {
    res.cookie(ID_COOKIE, id_token, cookieOptions(SEVEN_DAYS_MS));
  }
  if (access_token) {
    const accessMaxAge = expires_in ? expires_in * 1000 : SEVEN_DAYS_MS;
    res.cookie(ACCESS_COOKIE, access_token, cookieOptions(accessMaxAge));
  }
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(ID_COOKIE, { path: '/' });
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ ok: true });
});

export default router;
