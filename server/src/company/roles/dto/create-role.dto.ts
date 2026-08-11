import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COMPANY_PERMISSIONS, CompanyPermission } from './company-permission';

export class CreateRoleDto {
  @ApiProperty({ example: 'Розробник' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    enum: COMPANY_PERMISSIONS,
    isArray: true,
    example: ['MANAGE_MEMBERS'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(COMPANY_PERMISSIONS, { each: true })
  permissions?: CompanyPermission[];
}
