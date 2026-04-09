import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

if (process.env.DEV_BYPASS_AUTH === 'true') {
  console.warn('WARNING: DEV AUTH BYPASS ACTIVE');
}

const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

let client = null;

function getJwksClient() {
  if (!region || !userPoolId) return null;
  if (!client) {
    client = jwksClient({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }
  return client;
}

function getKey(header, callback) {
  const jwks = getJwksClient();
  if (!jwks) {
    callback(new Error('Cognito is not configured'));
    return;
  }
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, key.getPublicKey());
  });
}

export function verifyIdToken(token) {
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer,
        audience: clientId,
      },
      (err, payload) => {
        if (err) reject(err);
        else resolve(payload);
      }
    );
  });
}

/**
 * Express middleware: validates hub_id_token httpOnly cookie (Cognito ID token).
 */
export async function requireAuth(req, res, next) {
  try {
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      req.dbUserId = '00000000-0000-0000-0000-000000000000';
      req.user = {
        sub: 'dev-bypass-local',
        email: 'dev@lucid.local',
        name: 'Dev bypass',
      };
      next();
      return;
    }
    if (!region || !userPoolId || !clientId) {
      res.status(503).json({ error: 'Authentication is not configured on the server' });
      return;
    }
    const token = req.cookies?.hub_id_token;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = await verifyIdToken(token);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
