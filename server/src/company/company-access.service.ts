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

  async requireAdmin(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Only admins can manage company settings');
    return user.companyId;
  }
}
