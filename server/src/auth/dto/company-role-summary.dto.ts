import { ApiProperty } from '@nestjs/swagger';
import {
  COMPANY_PERMISSIONS,
  CompanyPermission,
} from '../../company/roles/dto/company-permission';

/** The role a user's permissions are attached to — not the full CompanyRole entity. */
export class CompanyRoleSummaryDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Founder' })
  name: string;

  @ApiProperty({ enum: COMPANY_PERMISSIONS, isArray: true, example: ['ADMIN'] })
  permissions: CompanyPermission[];
}
