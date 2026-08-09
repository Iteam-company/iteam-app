import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
