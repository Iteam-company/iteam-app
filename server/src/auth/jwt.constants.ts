// Single source of truth for JWT signing config — both JwtModule (signing)
// and JwtStrategy (verification) must agree on the secret, so it lives here
// instead of being duplicated in each.
export const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';

// Short-lived on purpose: a leaked access token is only useful until it
// expires, and there is no way to revoke it early (stateless JWT). Sessions
// (refresh tokens, see Session model + JwtTokenService) are what carry the
// actual login duration and can be revoked.
export const JWT_ACCESS_EXPIRES_IN = '15m';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
