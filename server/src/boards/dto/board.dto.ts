import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type BoardType = 'LIST' | 'KANBAN' | 'SCRUM';
const BOARD_TYPES = ['LIST', 'KANBAN', 'SCRUM'] as const;

export class CreateBoardDto {
  @ApiProperty({ example: 'Main Board' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'KANBAN', enum: BOARD_TYPES })
  @IsOptional()
  @IsEnum(BOARD_TYPES)
  type?: BoardType;
}

export class UpdateBoardDto extends PartialType(CreateBoardDto) {}
