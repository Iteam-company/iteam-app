import { IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { COMPANY_PERMISSIONS, CompanyPermission } from './company-permission';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    enum: COMPANY_PERMISSIONS,
    isArray: true,
    example: ['MANAGE_MEMBERS', 'INVITE_MEMBERS'],
  })
  @IsArray()
  @IsEnum(COMPANY_PERMISSIONS, { each: true })
  permissions: CompanyPermission[];
}
