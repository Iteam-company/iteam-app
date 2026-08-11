// Single source of truth for JWT signing config — both JwtModule (signing)
// and JwtStrategy (verification) must agree on the secret, so it lives here
// instead of being duplicated in each.
export const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
export const JWT_EXPIRES_IN = '7d';
