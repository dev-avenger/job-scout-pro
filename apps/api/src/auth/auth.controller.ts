import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Inject } from '@nestjs/common';
import { RegisterRequestSchema, LoginRequestSchema } from '@auto-job-apply/shared-types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AUTH_SERVICE } from './auth.constants.js';
import type { IAuthService } from './interfaces/auth-service.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { z } from 'zod';

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authService: IAuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterRequestSchema)) body: { email: string; password: string },
  ) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: { email: string; password: string },
  ) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(
    @Body(new ZodValidationPipe(z.object({ refreshToken: z.string() }))) body: { refreshToken: string },
  ) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
  }
}
