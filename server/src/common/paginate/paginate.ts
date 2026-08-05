import { ApiProperty } from '@nestjs/swagger';

// ── Meta ──────────────────────────────────────────────────────────────────────

export class PaginatedMeta {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 42 }) total: number;
  @ApiProperty({ example: 3 }) totalPages: number;
  @ApiProperty({ example: false }) hasPrevious: boolean;
  @ApiProperty({ example: true }) hasNext: boolean;
}

// ── Generic response shape ────────────────────────────────────────────────────

export class Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Generic Prisma paginator — works with any model delegate.
 *
 * ```ts
 * return paginate<User>(this.prisma.user, { page, limit }, {
 *   where: { companyId, role },
 *   select: { id: true, email: true },
 *   orderBy: { fullName: 'asc' },
 * });
 * ```
 */
export async function paginate<T>(
  delegate: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany(args: any): Promise<T[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(args: any): Promise<number>;
  },
  query: { page?: number; limit?: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
): Promise<Paginated<T>> {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    delegate.findMany({ ...args, skip, take: limit }),
    delegate.count({ where: args.where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
  };
}
