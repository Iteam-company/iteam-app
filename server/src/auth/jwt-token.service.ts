import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: number;
  email: string;
}

/**
 * Centralizes JWT issuance. Today this is a single long-lived access token
 * (7d, see jwt.constants.ts) — there is no refresh token, no rotation, and
 * no revocation list. Signing out just drops the token client-side; a
 * leaked token stays valid for up to 7 days. If refresh tokens get added
 * later, this is where signRefreshToken/verifyRefreshToken should live
 * alongside signAccessToken.
 */
@Injectable()
export class JwtTokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }
}
