import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthResponseDto,
  ForgotPasswordDto,
  MeResponseDto,
  MessageResponseDto,
  RefreshResponseDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  UpdateProfileDto,
} from './dto';
import { JwtTokenService } from './jwt-token.service';

const ME_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  occupation: true,
  companyId: true,
  companyRole: { select: { id: true, name: true, permissions: true } },
  statusNote: true,
  salary: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: JwtTokenService,
  ) {}

  // ── Sign Up ──────────────────────────────────────────────────────────────────

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    if (dto.password !== dto.repeatPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        fullName: dto.fullName,
        phone: dto.phone,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        occupation: dto.occupation,
      },
    });

    return this.buildTokenResponse(user.id, user.email);
  }

  // ── Sign In ──────────────────────────────────────────────────────────────────

  async signIn(dto: SignInDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildTokenResponse(user.id, user.email);
  }

  // ── Refresh / Sign Out ────────────────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    const { userId, refreshToken } = await this.tokens.rotateSession(
      dto.refreshToken,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    return {
      accessToken: this.tokens.signAccessToken({
        sub: user.id,
        email: user.email,
      }),
      refreshToken,
    };
  }

  async signOut(dto: RefreshTokenDto): Promise<MessageResponseDto> {
    await this.tokens.revokeSession(dto.refreshToken);
    return { message: 'Signed out' };
  }

  // ── Forgot Password ───────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Always return success to avoid email enumeration
    if (!user)
      return { message: 'If that email exists, a reset token has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // In production, email the token. Returned here for dev convenience.
    return { message: 'Reset token generated.', resetToken: token };
  }

  // ── Reset Password ────────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    if (dto.password !== dto.repeatPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new NotFoundException('Invalid or expired reset token');

    const hashed = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });

    return { message: 'Password reset successfully' };
  }

  // ── Me ───────────────────────────────────────────────────────────────────────

  async updateMe(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<MeResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: ME_SELECT,
    });
    return {
      ...user,
      salary: user.salary != null ? Number(user.salary) : null,
    };
  }

  async getMe(userId: number): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ME_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...user,
      salary: user.salary != null ? Number(user.salary) : null,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async buildTokenResponse(
    id: number,
    email: string,
  ): Promise<AuthResponseDto> {
    const refreshToken = await this.tokens.createSession(id);
    return {
      accessToken: this.tokens.signAccessToken({ sub: id, email }),
      refreshToken,
      user: { id, email },
    };
  }
}
