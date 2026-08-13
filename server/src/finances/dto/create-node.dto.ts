import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FINANCE_DESTINATION_TYPES,
  FINANCE_INCOME_STATUSES,
  FINANCE_NODE_KINDS,
  FinanceDestinationType,
  FinanceIncomeStatus,
  FinanceNodeKind,
} from './finance-enums';

export class CreateNodeDto {
  @ApiProperty({ enum: FINANCE_NODE_KINDS })
  @IsEnum(FINANCE_NODE_KINDS)
  kind: FinanceNodeKind;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  y?: number;

  // ── Destination ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({ enum: FINANCE_DESTINATION_TYPES })
  @IsOptional()
  @IsEnum(FINANCE_DESTINATION_TYPES)
  destinationType?: FinanceDestinationType;

  @ApiPropertyOptional({
    example: 'Wise EUR',
    description: 'Custom name — required when destinationType is OTHER',
  })
  @IsOptional()
  @IsString()
  label?: string;

  // ── Income ──────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number | null;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Exact date when dateTo is omitted, otherwise range start',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string | null;

  @ApiPropertyOptional({ example: '2026-09-05' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string | null;

  @ApiPropertyOptional({ enum: FINANCE_INCOME_STATUSES })
  @IsOptional()
  @IsEnum(FINANCE_INCOME_STATUSES)
  status?: FinanceIncomeStatus;

  // ── Note ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'VAT due on the 20th' })
  @IsOptional()
  @IsString()
  text?: string;
}
