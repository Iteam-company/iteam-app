import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Adoro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Ukraine' })
  @IsOptional()
  @IsString()
  country?: string;

  // @IsOptional() skips validation for null as well as undefined, so an
  // explicit `"hours": null` survives the global whitelisting ValidationPipe
  // and reaches Prisma as a NULL — that is how a fixed-price project is stored.
  @ApiPropertyOptional({ example: 40, description: 'null = fixed price' })
  @IsOptional()
  @IsInt()
  @Min(0)
  hours?: number | null;

  @ApiPropertyOptional({
    example: [1],
    description: 'Company member ids that hold the project',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  holderIds?: number[];

  @ApiPropertyOptional({
    example: [2, 3],
    description: 'Company member ids that help on the project',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  helperIds?: number[];
}
