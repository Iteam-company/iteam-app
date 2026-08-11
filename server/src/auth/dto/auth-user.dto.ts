import { ApiProperty } from '@nestjs/swagger';

/** Minimal user info returned alongside the access token at sign-up/sign-in. */
export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;
}
