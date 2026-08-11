import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyRoleSummaryDto } from './company-role-summary.dto';

/**
 * Deliberately lean — just enough to render "who am I" plus the
 * authorization context (companyRole, and the permissions it carries).
 * No task/board/workday data belongs here; fetch those from their own
 * endpoints.
 */
export class MeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  fullName: string;

  @ApiPropertyOptional({ example: '+380971234567', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: 'Software Engineer', nullable: true })
  occupation: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  companyId: number | null;

  @ApiPropertyOptional({
    type: CompanyRoleSummaryDto,
    nullable: true,
    description:
      'The company role this user is assigned — carries their permissions',
  })
  companyRole: CompanyRoleSummaryDto | null;

  @ApiPropertyOptional({ nullable: true })
  statusNote: string | null;

  @ApiPropertyOptional({ example: 50000, nullable: true })
  salary?: number | null;
}
