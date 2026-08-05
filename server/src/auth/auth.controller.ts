import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new user' })
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in and receive a JWT' })
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset token' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using a token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(req.user.id, dto);
  }
}
