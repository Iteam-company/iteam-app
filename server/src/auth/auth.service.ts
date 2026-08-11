import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── Sign Up ──────────────────────────────────────────────────────────────────

  async signUp(dto: SignUpDto) {
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

  async signIn(dto: SignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildTokenResponse(user.id, user.email);
  }

  // ── Forgot Password ───────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
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

  async resetPassword(dto: ResetPasswordDto) {
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

  async updateMe(userId: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        occupation: true,
        companyId: true,
        companyRoleId: true,
        companyRole: { select: { id: true, name: true, permissions: true } },
      },
    });
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        occupation: true,
        companyId: true,
        companyRoleId: true,
        companyRole: { select: { id: true, name: true, permissions: true } },
        statusNote: true,
        salary: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private buildTokenResponse(id: number, email: string) {
    const payload: JwtPayload = { sub: id, email };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id, email },
    };
  }
}
