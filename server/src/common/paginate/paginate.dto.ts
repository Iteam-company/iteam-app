import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Extend this class in any query DTO that needs pagination + search.
 *
 * Usage:
 *   class GetMembersQuery extends PaginateDto {
 *     @IsOptional() @IsInt() companyRoleId?: number;
 *   }
 */
export class PaginateDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 500)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'alice',
    description: 'Full-text search term',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
