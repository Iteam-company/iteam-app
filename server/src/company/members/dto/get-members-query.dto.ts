import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginateDto } from '../../../common/paginate';

export class GetMembersQueryDto extends PaginateDto {
  @ApiPropertyOptional({ example: 'ADMIN', enum: ['USER', 'ADMIN'] })
  @IsOptional()
  @IsString()
  role?: 'USER' | 'ADMIN';

  @ApiPropertyOptional({
    example: 'Розробник',
    description: 'Filter by occupation (exact match)',
  })
  @IsOptional()
  @IsString()
  occupation?: string;
}
