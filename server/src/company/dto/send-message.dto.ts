import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
