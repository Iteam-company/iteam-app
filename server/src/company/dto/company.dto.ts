import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginateDto } from '../../common/paginate';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: 'A modern Ukrainian SMB platform' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'smtp.ukr.net' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  smtpHost?: string;

  @ApiPropertyOptional({ example: 465 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional({ example: 'company@ukr.net' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  smtpUser?: string;

  @ApiPropertyOptional({ example: 'secret' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  smtpPassword?: string;

  @ApiPropertyOptional({ example: 'noreply@company.ukr.net' })
  @IsOptional()
  @IsEmail()
  smtpFromEmail?: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Розробник' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class BulkCreateRolesDto {
  @ApiProperty({ example: ['Менеджер', 'Розробник', 'Дизайнер'] })
  @IsArray()
  @IsString({ each: true })
  names: string[];
}

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'ADMIN', enum: ['USER', 'ADMIN'] })
  @IsString()
  @IsNotEmpty()
  role: 'USER' | 'ADMIN';
}

export class UpdateMemberOccupationDto {
  @ApiProperty({ example: 'Розробник' })
  @IsString()
  @IsNotEmpty()
  occupation: string;
}

export class UpdateMemberSalaryDto {
  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number | null;
}

export class GetMembersQueryDto extends PaginateDto {
  @ApiPropertyOptional({ example: 'ADMIN', enum: ['USER', 'ADMIN'] })
  @IsOptional()
  @IsString()
  role?: 'USER' | 'ADMIN';

  @ApiPropertyOptional({ example: 'Розробник', description: 'Filter by occupation (exact match)' })
  @IsOptional()
  @IsString()
  occupation?: string;
}

export class InviteUsersDto {
  @ApiProperty({ example: ['alice@company.ua', 'bob@company.ua'] })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];
}

export class SendMessageDto {
  @ApiProperty({ example: 'Team update — April 2026' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Hello team, here is the latest update...' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];
}
