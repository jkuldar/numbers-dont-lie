import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProtectedController } from './protected.controller';
import { PrismaService } from './prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { GithubStrategy } from './github.strategy';
import { EncryptionService } from './encryption.service';
import { TwoFAService } from './twofa.service';
import { HealthProfileController } from './health-profile.controller';
import { HealthProfileService } from './health-profile.service';
import { PrivacySettingsController } from './privacy-settings.controller';
import { PrivacySettingsService } from './privacy-settings.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [
    HealthController, 
    AuthController, 
    ProtectedController,
    HealthProfileController,
    PrivacySettingsController,
  ],
  providers: [
    HealthService,
    AuthService,
    PrismaService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    EncryptionService,
    TwoFAService,
    HealthProfileService,
    PrivacySettingsService,
  ],
})
export class AppModule {}
