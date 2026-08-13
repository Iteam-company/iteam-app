import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAccessService } from '../company/company-access.service';
import {
  CreateEdgeDto,
  CreateNodeDto,
  CreateSheetDto,
  UpdateNodeDto,
} from './dto';

const SHEET_INCLUDE = {
  nodes: {
    include: {
      project: {
        select: {
          id: true,
          name: true,
          members: {
            where: { role: 'HOLDER' as const },
            select: { user: { select: { id: true, fullName: true } } },
          },
        },
      },
    },
    orderBy: { id: 'asc' as const },
  },
  edges: { orderBy: { id: 'asc' as const } },
} as const;

@Injectable()
export class FinancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  // ── Sheets ────────────────────────────────────────────────────────────────

  /** Tab strip: every sheet, newest month first, template last. */
  async listSheets(userId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    return this.prisma.financeSheet.findMany({
      where: { companyId },
      select: { id: true, kind: true, year: true, month: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getSheet(userId: number, sheetId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const sheet = await this.prisma.financeSheet.findFirst({
      where: { id: sheetId, companyId },
      include: SHEET_INCLUDE,
    });
    if (!sheet) throw new NotFoundException('Sheet not found');
    return sheet;
  }

  /**
   * The template is created on first access rather than at company setup, so
   * existing companies get one without a backfill.
   */
  async getTemplate(userId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const existing = await this.prisma.financeSheet.findFirst({
      where: { companyId, kind: 'TEMPLATE' },
      include: SHEET_INCLUDE,
    });
    if (existing) return existing;

    return this.prisma.financeSheet.create({
      data: { companyId, kind: 'TEMPLATE' },
      include: SHEET_INCLUDE,
    });
  }

  async createSheet(userId: number, dto: CreateSheetDto) {
    const companyId = await this.companyAccess.requireCompany(userId);

    const clash = await this.prisma.financeSheet.findFirst({
      where: { companyId, year: dto.year, month: dto.month },
      select: { id: true },
    });
    if (clash) throw new ConflictException('That month already exists');

    const sheet = await this.prisma.financeSheet.create({
      data: { companyId, kind: 'MONTH', year: dto.year, month: dto.month },
    });

    if (dto.fromTemplate !== false) {
      await this.cloneTemplateInto(companyId, sheet.id, dto.year, dto.month);
    }

    return this.prisma.financeSheet.findUnique({
      where: { id: sheet.id },
      include: SHEET_INCLUDE,
    });
  }

  async removeSheet(userId: number, sheetId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const sheet = await this.requireSheet(companyId, sheetId);
    if (sheet.kind === 'TEMPLATE')
      throw new BadRequestException('The template sheet cannot be deleted');

    await this.prisma.financeSheet.delete({ where: { id: sheetId } });
    return { deleted: true };
  }

  /**
   * Copies the template's boxes, their positions and their arrows into a fresh
   * month. What is deliberately *not* copied is the month-specific data: an
   * amount, a status and a date belong to the month they were recorded in, so
   * amounts are cleared, statuses reset to NOT_TRANSFERRED and any template
   * dates are shifted onto the same day-of-month in the new month.
   */
  private async cloneTemplateInto(
    companyId: number,
    sheetId: number,
    year: number,
    month: number,
  ) {
    const template = await this.prisma.financeSheet.findFirst({
      where: { companyId, kind: 'TEMPLATE' },
      include: { nodes: true, edges: true },
    });
    if (!template?.nodes.length) return;

    // Template node id -> new node id, so the arrows can be remapped.
    const idMap = new Map<number, number>();

    for (const node of template.nodes) {
      const created = await this.prisma.financeNode.create({
        data: {
          sheetId,
          kind: node.kind,
          x: node.x,
          y: node.y,
          destinationType: node.destinationType,
          label: node.label,
          projectId: node.projectId,
          currency: node.currency,
          text: node.text,
          amount: null,
          status: node.kind === 'INCOME' ? 'NOT_TRANSFERRED' : null,
          dateFrom: shiftIntoMonth(node.dateFrom, year, month),
          dateTo: shiftIntoMonth(node.dateTo, year, month),
        },
        select: { id: true },
      });
      idMap.set(node.id, created.id);
    }

    const edges = template.edges
      .map((edge) => ({
        sheetId,
        sourceId: idMap.get(edge.sourceId),
        targetId: idMap.get(edge.targetId),
      }))
      .filter(
        (e): e is { sheetId: number; sourceId: number; targetId: number } =>
          e.sourceId != null && e.targetId != null,
      );

    if (edges.length) await this.prisma.financeEdge.createMany({ data: edges });
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────

  async createNode(userId: number, sheetId: number, dto: CreateNodeDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireSheet(companyId, sheetId);
    const data = await this.buildNodeData(companyId, dto.kind, dto);

    return this.prisma.financeNode.create({
      data: { sheetId, kind: dto.kind, x: dto.x ?? 0, y: dto.y ?? 0, ...data },
      include: SHEET_INCLUDE.nodes.include,
    });
  }

  async updateNode(userId: number, nodeId: number, dto: UpdateNodeDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const node = await this.requireNode(companyId, nodeId);
    const data = await this.buildNodeData(companyId, node.kind, dto);

    return this.prisma.financeNode.update({
      where: { id: nodeId },
      data: {
        ...(dto.x !== undefined ? { x: dto.x } : {}),
        ...(dto.y !== undefined ? { y: dto.y } : {}),
        ...data,
      },
      include: SHEET_INCLUDE.nodes.include,
    });
  }

  async removeNode(userId: number, nodeId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireNode(companyId, nodeId);
    await this.prisma.financeNode.delete({ where: { id: nodeId } });
    return { deleted: true };
  }

  /**
   * Only lets through the fields that belong to the box's kind, so an income
   * amount can never end up on a note. Keys absent from the DTO are left alone.
   */
  private async buildNodeData(
    companyId: number,
    kind: string,
    dto: UpdateNodeDto,
  ) {
    // Only keys actually present in the DTO are written. Collapsing an absent
    // key to null here would make a position-only patch (what a drag sends)
    // wipe the box's amount, text or name.
    const set = <T>(value: T | undefined, key: string) =>
      value === undefined ? {} : { [key]: value };

    if (kind === 'DESTINATION') {
      if (dto.destinationType === 'OTHER' && !dto.label?.trim())
        throw new BadRequestException('A custom destination needs a name');
      return {
        ...set(dto.destinationType, 'destinationType'),
        ...set(
          dto.label === undefined ? undefined : dto.label.trim() || null,
          'label',
        ),
      };
    }

    if (kind === 'INCOME') {
      let label: string | undefined;
      if (dto.projectId !== undefined) {
        const project = await this.prisma.project.findFirst({
          where: { id: dto.projectId, companyId },
          select: { name: true },
        });
        if (!project) throw new NotFoundException('Project not found');
        // Snapshot the name so the box still reads correctly if the project
        // is deleted later (the relation is SetNull).
        label = project.name;
      }
      return {
        ...set(dto.projectId, 'projectId'),
        ...set(label, 'label'),
        ...set(dto.amount, 'amount'),
        ...set(dto.currency?.toUpperCase(), 'currency'),
        ...set(toDate(dto.dateFrom), 'dateFrom'),
        ...set(toDate(dto.dateTo), 'dateTo'),
        ...set(dto.status, 'status'),
      };
    }

    return set(
      dto.text === undefined ? undefined : dto.text.trim() || null,
      'text',
    );
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  async createEdge(userId: number, sheetId: number, dto: CreateEdgeDto) {
    const companyId = await this.companyAccess.requireCompany(userId);
    await this.requireSheet(companyId, sheetId);

    if (dto.sourceId === dto.targetId)
      throw new BadRequestException('A box cannot point at itself');

    const ends = await this.prisma.financeNode.findMany({
      where: { id: { in: [dto.sourceId, dto.targetId] }, sheetId },
      select: { id: true },
    });
    if (ends.length !== 2)
      throw new BadRequestException('Both boxes must be on this sheet');

    const existing = await this.prisma.financeEdge.findUnique({
      where: {
        sourceId_targetId: { sourceId: dto.sourceId, targetId: dto.targetId },
      },
    });
    if (existing) return existing;

    return this.prisma.financeEdge.create({
      data: { sheetId, sourceId: dto.sourceId, targetId: dto.targetId },
    });
  }

  async removeEdge(userId: number, edgeId: number) {
    const companyId = await this.companyAccess.requireCompany(userId);
    const edge = await this.prisma.financeEdge.findFirst({
      where: { id: edgeId, sheet: { companyId } },
      select: { id: true },
    });
    if (!edge) throw new NotFoundException('Connection not found');

    await this.prisma.financeEdge.delete({ where: { id: edgeId } });
    return { deleted: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async requireSheet(companyId: number, sheetId: number) {
    const sheet = await this.prisma.financeSheet.findFirst({
      where: { id: sheetId, companyId },
      select: { id: true, kind: true },
    });
    if (!sheet) throw new NotFoundException('Sheet not found');
    return sheet;
  }

  private async requireNode(companyId: number, nodeId: number) {
    const node = await this.prisma.financeNode.findFirst({
      where: { id: nodeId, sheet: { companyId } },
      select: { id: true, kind: true },
    });
    if (!node) throw new NotFoundException('Box not found');
    return node;
  }
}

// ── Dates ───────────────────────────────────────────────────────────────────

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/**
 * Moves a template date onto the same day of the target month, clamping to the
 * last day so a 31st does not spill into the next month.
 */
function shiftIntoMonth(
  date: Date | null,
  year: number,
  month: number,
): Date | null {
  if (!date) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month - 1, day));
}
