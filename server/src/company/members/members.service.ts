import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/paginate';
import { CompanyAccessService } from '../company-access.service';
import {
  GetMembersQueryDto,
  UpdateMemberCompanyRoleDto,
  UpdateMemberOccupationDto,
  UpdateMemberSalaryDto,
} from './dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async getMembers(userId: number, query: GetMembersQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyRole: true },
    });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    const { companyId } = user;
    const isAdmin = Boolean(user.companyRole?.permissions.includes('ADMIN'));

    const search = query.search?.trim();
    const where = {
      companyId,
      ...(query.companyRoleId ? { companyRoleId: query.companyRoleId } : {}),
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
      companyRoleId: true,
      companyRole: { select: { id: true, name: true, permissions: true } },
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
    const companyId = await this.companyAccess.requireAdmin(userId);
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

  async updateMemberCompanyRole(
    userId: number,
    memberId: number,
    dto: UpdateMemberCompanyRoleDto,
  ) {
    const companyId = await this.companyAccess.requireAdmin(userId);
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (memberId === userId)
      throw new BadRequestException('Cannot change your own role');

    if (dto.companyRoleId != null) {
      const role = await this.prisma.companyRole.findFirst({
        where: { id: dto.companyRoleId, companyId },
      });
      if (!role) throw new NotFoundException('Role not found');
    }

    return this.prisma.user.update({
      where: { id: memberId },
      data: { companyRoleId: dto.companyRoleId },
      select: {
        id: true,
        email: true,
        fullName: true,
        companyRoleId: true,
        companyRole: { select: { id: true, name: true, permissions: true } },
      },
    });
  }

  async updateMemberOccupation(
    userId: number,
    memberId: number,
    dto: UpdateMemberOccupationDto,
  ) {
    const companyId = await this.companyAccess.requireAdmin(userId);
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
    const companyId = await this.companyAccess.requireAdmin(userId);
    if (memberId === userId)
      throw new BadRequestException('Cannot remove yourself from the company');
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, companyId },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.user.update({
      where: { id: memberId },
      data: { companyId: null, companyRoleId: null },
    });
    return { removed: true };
  }
}
