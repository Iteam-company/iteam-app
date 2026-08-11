import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccessService } from './company-access.service';
import {
  CreateCompanyDto,
  InviteUsersDto,
  SendMessageDto,
  UpdateCompanyDto,
  UpdateCompanySettingsDto,
} from './dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userId: number, dto: CreateCompanyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.companyId)
      throw new BadRequestException('User already belongs to a company');

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { ...dto } });

      const adminRole = await tx.companyRole.create({
        data: { name: 'Founder', companyId: company.id, permissions: ['ADMIN'] },
      });

      await tx.user.update({
        where: { id: userId },
        data: { companyId: company.id, companyRoleId: adminRole.id },
      });

      return company;
    });
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findByUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: { include: { roles: true, settings: true } } },
    });
    return user?.company ?? null;
  }

  async findById(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { roles: true, settings: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(userId: number, dto: UpdateCompanyDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async getSettings(userId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    return (
      settings ?? {
        companyId,
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        smtpFromEmail: null,
      }
    );
  }

  async updateSettings(userId: number, dto: UpdateCompanySettingsDto) {
    const companyId = await this.companyAccess.requireAdmin(userId);
    return this.prisma.companySettings.upsert({
      where: { companyId },
      update: dto,
      create: { companyId, ...dto },
    });
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  async inviteUsers(userId: number, dto: InviteUsersDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { settings: true },
    });

    const settings = company?.settings;
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

    if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPassword) {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort ?? 587,
        secure: (settings.smtpPort ?? 587) === 465,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword,
        },
      });

      const from = settings.smtpFromEmail ?? settings.smtpUser;
      const results = await Promise.allSettled(
        dto.emails.map((email) =>
          transporter.sendMail({
            from,
            to: email,
            subject: `You've been invited to join ${company!.title}`,
            text: `You've been invited to join ${company!.title} on Iteam.\n\nSign in at: ${clientUrl}/auth/sign-in`,
            html: `
              <p>You've been invited to join <strong>${company!.title}</strong> on Iteam.</p>
              <p><a href="${clientUrl}/auth/sign-in">Click here to sign in</a></p>
            `,
          }),
        ),
      );

      const sent = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return {
        queued: dto.emails.length,
        sent,
        failed,
        emails: dto.emails,
        message:
          failed > 0
            ? `${sent} sent, ${failed} failed`
            : `${sent} invitation(s) sent successfully`,
      };
    }

    return {
      queued: dto.emails.length,
      sent: 0,
      failed: 0,
      emails: dto.emails,
      message:
        'Invitations queued — configure SMTP in Company Settings to send emails',
    };
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async sendMessage(userId: number, dto: SendMessageDto) {
    const companyId = await this.companyAccess.requireAdmin(userId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { settings: true },
    });

    const settings = company?.settings;
    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
      throw new BadRequestException(
        'SMTP is not configured. Set up email in Company → Settings first.',
      );
    }

    const recipients = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds }, companyId },
      select: { email: true, fullName: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      secure: (settings.smtpPort ?? 587) === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword },
    });

    const from = settings.smtpFromEmail ?? settings.smtpUser;
    const results = await Promise.allSettled(
      recipients.map((r) =>
        transporter.sendMail({
          from,
          to: r.email,
          subject: dto.subject,
          text: dto.body,
          html: `<p>${dto.body.replace(/\n/g, '<br>')}</p>`,
        }),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    if (failures.length > 0) {
      console.error(
        '[sendMessage] SMTP errors:',
        failures.map((f) => f.reason?.message ?? f.reason),
      );
    }

    return {
      sent,
      failed: failures.length,
      total: recipients.length,
      errors: failures.map((f) => String(f.reason?.message ?? f.reason)),
    };
  }
}
