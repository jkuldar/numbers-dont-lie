import { Controller, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password required');
    }
    try {
      return await this.authService.register(body.email, body.password);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password required');
    }
    try {
      return await this.authService.login(body.email, body.password);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('verify-email')
  async verifyEmail(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('Verification code required');
    }
    try {
      return await this.authService.verifyEmail(code);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token required');
    }
    try {
      return await this.authService.refreshAccessToken(body.refreshToken);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
