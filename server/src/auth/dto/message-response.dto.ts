import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ example: 'Password reset successfully' })
  message: string;

  @ApiPropertyOptional({
    description: 'Returned in dev only',
    example: 'a1b2c3…',
  })
  resetToken?: string;
}
