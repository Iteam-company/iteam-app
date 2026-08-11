import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginateDto } from '../../../common/paginate';

export class GetMembersQueryDto extends PaginateDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Filter by assigned CompanyRole id',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyRoleId?: number;

  @ApiPropertyOptional({
    example: 'Розробник',
    description: 'Filter by occupation (exact match)',
  })
  @IsOptional()
  @IsString()
  occupation?: string;
}
