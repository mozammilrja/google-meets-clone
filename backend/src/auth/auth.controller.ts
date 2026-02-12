import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account
   * Rate limited to 5 registrations per hour per IP
   */
  @Post('register')
  @RateLimit({ limit: 5, windowSeconds: 3600, errorMessage: 'Too many registration attempts. Please try again later.' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  /**
   * Login with email and password
   * Rate limited to 10 login attempts per 15 minutes per IP to prevent brute force
   */
  @Post('login')
  @RateLimit({ limit: 10, windowSeconds: 900, errorMessage: 'Too many login attempts. Please try again later.' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }
}
