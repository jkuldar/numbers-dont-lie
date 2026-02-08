import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { TwoFAService } from './twofa.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private twoFAService: TwoFAService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: { email, passwordHash, verificationCode },
    });

    // Send verification email
    await this.sendVerificationEmail(email, verificationCode);

    return { message: 'User registered. Check your email for verification link.' };
  }

  async login(email: string, password: string, twoFactorToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if OAuth user trying to login with password
    if (user.oauthProvider && !user.passwordHash) {
      throw new Error(`Please login with ${user.oauthProvider}`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    if (!user.emailVerified) {
      throw new Error('Email not verified');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return { requires2FA: true, message: '2FA token required' };
      }

      const valid2FA = await this.twoFAService.verifyToken(user.id, twoFactorToken);
      if (!valid2FA) {
        throw new Error('Invalid 2FA token');
      }
    }

    return this.generateTokens(user.id, user.email);
  }

  async loginWithOAuth(user: any) {
    return this.generateTokens(user.id, user.email);
  }

  async generateTokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: '7d' },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedRefreshToken,
        lastActivityAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  async verifyEmail(verificationCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationCode },
    });

    if (!user) {
      throw new Error('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationCode: null },
    });

    return { message: 'Email verified successfully' };
  }

  async refreshAccessToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new Error('Invalid refresh token');
      }

      const matches = await bcrypt.compare(oldRefreshToken, user.refreshToken);
      if (!matches) {
        throw new Error('Invalid refresh token');
      }

      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '15m' },
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActivityAt: new Date() },
      });

      return { accessToken };
    } catch {
      throw new Error('Refresh token expired or invalid');
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    if (user.oauthProvider && !user.passwordHash) {
      throw new Error('OAuth users cannot reset password');
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await this.sendPasswordResetEmail(email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetToken },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  private async sendVerificationEmail(email: string, code: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?code=${code}`;

    // In development, log the verification code
    if (process.env.NODE_ENV !== 'production') {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  EMAIL VERIFICATION CODE (Development Only)               ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Email: ${email.padEnd(48)} ║`);
      console.log(`║  Code:  ${code.substring(0, 48).padEnd(48)} ║`);
      console.log('║  ────────────────────────────────────────────────────────  ║');
      console.log(`║  Verify URL: https://localhost:3000/auth/verify-email?code=${code}`);
      console.log('╚════════════════════════════════════════════════════════════╝');
    }

    try {
      await this.mailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@wellness.local',
        to: email,
        subject: 'Verify your email',
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
      });
    } catch (error) {
      console.error('Email send failed:', error);
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  SMTP not configured - use the verification code above');
      }
    }
  }

  private async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    try {
      await this.mailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@wellness.local',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <p>You requested a password reset.</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (error) {
      console.error('Email send failed:', error);
    }
  }
}
