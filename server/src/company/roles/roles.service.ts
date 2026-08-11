import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyAccessService } from '../company-access.service';
import {
  BulkCreateRolesDto,
  CreateRoleDto,
  UpdateRolePermissionsDto,
} from './dto';

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
    const companyId = await this.companyAccess.requireAdmin(userId);
    return this.prisma.companyRole.upsert({
      where: { name_companyId: { name: dto.name, companyId } },
      update: {},
      create: { name: dto.name, companyId, permissions: dto.permissions ?? [] },
    });
  }

  async bulkCreateRoles(userId: number, dto: BulkCreateRolesDto) {
    const companyId = await this.companyAccess.requireAdmin(userId);
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

  async updateRolePermissions(
    userId: number,
    roleId: number,
    dto: UpdateRolePermissionsDto,
  ) {
    const companyId = await this.companyAccess.requireAdmin(userId);
    const role = await this.prisma.companyRole.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.companyRole.update({
      where: { id: roleId },
      data: { permissions: dto.permissions },
    });
  }

  async deleteRole(userId: number, roleId: number) {
    const companyId = await this.companyAccess.requireAdmin(userId);
    const role = await this.prisma.companyRole.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.companyRole.delete({ where: { id: roleId } });
    return { deleted: true };
  }
}
