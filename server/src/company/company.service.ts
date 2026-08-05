import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkCreateRolesDto,
  CreateCompanyDto,
  CreateRoleDto,
  GetMembersQueryDto,
  InviteUsersDto,
  SendMessageDto,
  UpdateCompanyDto,
  UpdateCompanySettingsDto,
  UpdateMemberOccupationDto,
  UpdateMemberRoleDto,
  UpdateMemberSalaryDto,
} from './dto/company.dto';
import { paginate } from '../common/paginate';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userId: number, dto: CreateCompanyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.companyId)
      throw new BadRequestException('User already belongs to a company');

    const company = await this.prisma.company.create({
      data: { ...dto },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { companyId: company.id },
    });

    return company;
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
    const companyId = await this.requireCompany(userId);
    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async getSettings(userId: number) {
    const companyId = await this.requireCompany(userId);
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
    const companyId = await this.requireAdmin(userId);
    return this.prisma.companySettings.upsert({
      where: { companyId },
      update: dto,
      create: { companyId, ...dto },
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  async getRoles(userId: number) {
    const companyId = await this.requireCompany(userId);
    return this.prisma.companyRole.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async addRole(userId: number, dto: CreateRoleDto) {
    const companyId = await this.requireCompany(userId);
    return this.prisma.companyRole.upsert({
      where: { name_companyId: { name: dto.name, companyId } },
      update: {},
      create: { name: dto.name, companyId },
    });
  }

  async bulkCreateRoles(userId: number, dto: BulkCreateRolesDto) {
    const companyId = await this.requireCompany(userId);
    const results = await Promise.all(
      dto.names.map((name) =>
        this.prisma.companyRole.upsert({
          where: { name_companyId: { name, companyId } },
          update: {},
          create: { name, companyId },
        }),
      ),
    );
    return results;
  }

  async deleteRole(userId: number, roleId: number) {
    const companyId = await this.requireCompany(userId);
    const role = await this.prisma.companyRole.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.companyRole.delete({ where: { id: roleId } });
    return { deleted: true };
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async getMembers(userId: number, query: GetMembersQueryDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    const { companyId } = user;
    const isAdmin = user.role === 'ADMIN';

    const search = query.search?.trim();
    const where = {
      companyId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.occupation ? { occupation: query.occupation } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              {
                occupation: { contains: search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const select = {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      occupation: true,
      role: true,
      createdAt: true,
      ...(isAdmin ? { salary: true } : {}),
    };
    return paginate(this.prisma.user, query, {
      where,
      select,
      orderBy: { fullName: 'asc' },
    });
  }

  async updateMemberSalary(
    userId: number,
    memberId: number,
    dto: UpdateMemberSalaryDto,
  ) {
    const companyId = await this.requireAdmin(userId);
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma.user as any).update({
      where: { id: memberId },
      data: { salary: dto.salary ?? null },
      select: { id: true, salary: true },
    });
  }

  async updateMemberRole(
    userId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ) {
    const companyId = await this.requireAdmin(userId);
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (memberId === userId)
      throw new BadRequestException('Cannot change your own role');
    return this.prisma.user.update({
      where: { id: memberId },
      data: { role: dto.role },
      select: { id: true, email: true, fullName: true, role: true },
    });
  }

  async updateMemberOccupation(
    userId: number,
    memberId: number,
    dto: UpdateMemberOccupationDto,
  ) {
    const companyId = await this.requireAdmin(userId);
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.user.update({
      where: { id: memberId },
      data: { occupation: dto.occupation },
      select: { id: true, email: true, fullName: true, occupation: true },
    });
  }

  async removeMember(userId: number, memberId: number) {
    const companyId = await this.requireAdmin(userId);
    if (memberId === userId)
      throw new BadRequestException('Cannot remove yourself from the company');
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.user.update({
      where: { id: memberId },
      data: { companyId: null, role: 'USER' },
    });
    return { removed: true };
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  async inviteUsers(userId: number, dto: InviteUsersDto) {
    const companyId = await this.requireCompany(userId);
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
    const companyId = await this.requireAdmin(userId);

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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async requireCompany(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    return user.companyId;
  }

  private async requireAdmin(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Only admins can manage company settings');
    return user.companyId;
  }
}
