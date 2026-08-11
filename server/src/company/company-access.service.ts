import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireCompany(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    return user.companyId;
  }

  /**
   * Requires the user's assigned CompanyRole to carry the blanket ADMIN
   * permission. This replaces the old Role-enum check — authorization now
   * always flows through CompanyRole.permissions, never a flat field on
   * User. No granular per-permission guard exists yet; this only checks
   * the ADMIN permission specifically.
   */
  async requireAdmin(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { companyRole: true },
    });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    if (!user.companyRole?.permissions.includes('ADMIN'))
      throw new ForbiddenException('Only admins can manage company settings');
    return user.companyId;
  }
}
