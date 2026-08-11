import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_TTL_MS } from './jwt.constants';

export interface JwtPayload {
  sub: number;
  email: string;
}

/**
 * Centralizes JWT/session issuance:
 *  - Access tokens are short-lived, stateless JWTs (signAccessToken) — fast
 *    to verify, but nothing can revoke one early once it's signed.
 *  - Sessions are long-lived, DB-backed refresh tokens (Session model). The
 *    plain token is only ever returned to the client once; only its SHA-256
 *    hash is stored, so a DB leak doesn't hand out usable tokens. Each
 *    refresh rotates the session: the presented token is revoked and a new
 *    one issued. Presenting an already-revoked token is treated as replay
 *    of a stolen token and revokes every session the user has.
 */
@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  async createSession(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.session.create({
      data: {
        tokenHash: this.hash(token),
        userId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return token;
  }

  /** Verifies + rotates a session's refresh token. Returns the new one. */
  async rotateSession(
    token: string,
  ): Promise<{ userId: number; refreshToken: string }> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    if (session.revokedAt) {
      // Reuse of an already-rotated token — likely theft. Kill every
      // session this user has so the real owner has to sign in again.
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token already used');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const refreshToken = await this.createSession(session.userId);
    return { userId: session.userId, refreshToken };
  }

  /** Revokes a single session (sign-out). No-op if already gone/revoked. */
  async revokeSession(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
