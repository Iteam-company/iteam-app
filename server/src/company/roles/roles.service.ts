import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyAccessService } from '../company-access.service';
import { BulkCreateRolesDto, CreateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async getRoles(userId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    return this.prisma.companyRole.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async addRole(userId: number, dto: CreateRoleDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    return this.prisma.companyRole.upsert({
      where: { name_companyId: { name: dto.name, companyId } },
      update: {},
      create: { name: dto.name, companyId },
    });
  }

  async bulkCreateRoles(userId: number, dto: BulkCreateRolesDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
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
    const companyId = await this.companyAccess.requireCompany(userId);
    const role = await this.prisma.companyRole.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.companyRole.delete({ where: { id: roleId } });
    return { deleted: true };
  }
}
