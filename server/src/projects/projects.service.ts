import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccessService } from '../company/company-access.service';
import {
  AddProjectMembersDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './dto';

const PROJECT_INCLUDE = {
  members: {
    include: {
      user: { select: { id: true, fullName: true, occupation: true } },
    },
    orderBy: { addedAt: 'asc' as const },
  },
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  /**
   * Every project of the company, with members — not paginated on purpose.
   * The graph lays out the whole holder → project → helper hierarchy in one
   * pass, and a truncated page would render edges pointing at missing nodes.
   * The list tab filters this same payload client-side.
   */
  async findAll(userId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    return this.prisma.project.findMany({
      where: { companyId },
      include: PROJECT_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: number, projectId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(userId: number, dto: CreateProjectDto) {
    const companyId = await this.companyAccess.requireCompany(userId);

    // A user listed as both holder and helper would violate the composite
    // primary key, so holders win and the duplicate is dropped.
    const holderIds = [...new Set(dto.holderIds ?? [])];
    const helperIds = [...new Set(dto.helperIds ?? [])].filter(
      (id) => !holderIds.includes(id),
    );
    await this.assertCompanyMembers(companyId, [...holderIds, ...helperIds]);

    return this.prisma.project.create({
      data: {
        name: dto.name.trim(),
        country: dto.country?.trim() || null,
        hours: dto.hours ?? null,
        companyId,
        members: {
          create: [
            ...holderIds.map((id) => ({ userId: id, role: 'HOLDER' as const })),
            ...helperIds.map((id) => ({ userId: id, role: 'HELPER' as const })),
          ],
        },
      },
      include: PROJECT_INCLUDE,
    });
  }

  async update(userId: number, projectId: number, dto: UpdateProjectDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireProject(companyId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.country !== undefined
          ? { country: dto.country?.trim() || null }
          : {}),
        ...(dto.hours !== undefined ? { hours: dto.hours ?? null } : {}),
      },
      include: PROJECT_INCLUDE,
    });
  }

  async remove(userId: number, projectId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireProject(companyId, projectId);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { deleted: true };
  }

  /** Re-adding an existing member switches their role instead of failing. */
  async addMembers(
    userId: number,
    projectId: number,
    dto: AddProjectMembersDto,
  ) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireProject(companyId, projectId);

    const userIds = [...new Set(dto.userIds)];
    await this.assertCompanyMembers(companyId, userIds);

    await Promise.all(
      userIds.map((uid) =>
        this.prisma.projectMember.upsert({
          where: { projectId_userId: { projectId, userId: uid } },
          update: { role: dto.role },
          create: { projectId, userId: uid, role: dto.role },
        }),
      ),
    );

    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: PROJECT_INCLUDE,
    });
  }

  async removeMember(userId: number, projectId: number, memberId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireProject(companyId, projectId);

    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId: memberId },
    });

    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: PROJECT_INCLUDE,
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async requireProject(companyId: number, projectId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /** Keeps people from another company off this company's projects. */
  private async assertCompanyMembers(companyId: number, userIds: number[]) {
    if (!userIds.length) return;
    const count = await this.prisma.user.count({
      where: { id: { in: userIds }, companyId },
    });
    if (count !== userIds.length)
      throw new BadRequestException(
        'Some users are not members of your company',
      );
  }
}
