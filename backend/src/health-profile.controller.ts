import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Patch, 
  Body, 
  UseGuards, 
  Req, 
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { HealthProfileService } from './health-profile.service';
import { Request } from 'express';

type AuthedRequest = Request & { user: { userId: string } };

@Controller('health-profile')
@UseGuards(JwtAuthGuard)
export class HealthProfileController {
  constructor(private healthProfileService: HealthProfileService) {}

  @Post()
  async createOrUpdateProfile(@Req() req: AuthedRequest, @Body() body: any) {
    const userId = req.user.userId;
    
    // Explicit consent check
    if (!body.consentGiven && body.consentGiven !== undefined) {
      throw new BadRequestException('Explicit consent required to save health data');
    }

    try {
      // Normalize units before saving
      const normalizedData = this.healthProfileService.normalizeUnits(body);
      return await this.healthProfileService.createOrUpdateProfile(userId, normalizedData);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Patch()
  async updateProfile(@Req() req: AuthedRequest, @Body() body: any) {
    const userId = req.user.userId;
    
    try {
      // Normalize units before saving
      const normalizedData = this.healthProfileService.normalizeUnits(body);
      return await this.healthProfileService.createOrUpdateProfile(userId, normalizedData);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get()
  async getProfile(@Req() req: AuthedRequest) {
    const userId = req.user.userId;
    const profile = await this.healthProfileService.getProfile(userId);
    
    if (!profile) {
      throw new NotFoundException('Health profile not found');
    }
    
    return profile;
  }

  @Post('weight')
  async addWeightEntry(@Req() req: AuthedRequest, @Body() body: { weightKg?: number; weight?: number; unit?: string; note?: string }) {
    const userId = req.user.userId;
    
    // Support both weightKg and weight fields
    const weightValue = body.weightKg || body.weight;
    
    if (!weightValue || weightValue <= 0) {
      throw new BadRequestException('Valid weight required');
    }

    try {
      const weightKg = body.weightKg || this.healthProfileService.convertWeightToKg(body.weight!, body.unit || 'kg');
      return await this.healthProfileService.addWeightEntry(userId, weightKg, body.note);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('weight-history')
  async getWeightHistory(@Req() req: AuthedRequest) {
    const userId = req.user.userId;
    return await this.healthProfileService.getWeightHistory(userId);
  }

  @Get('activity-entries')
  async getActivityEntries(@Req() req: AuthedRequest) {
    const userId = req.user.userId;
    return await this.healthProfileService.getActivityEntries(userId);
  }

  @Post('activity')
  async addActivity(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      type?: string;
      durationMin?: number;
      intensity?: string;
      calories?: number;
      steps?: number;
      loggedAt?: Date;
      note?: string;
    },
  ) {
    const userId = req.user.userId;
    return await this.healthProfileService.addActivityEntry(userId, body);
  }

  @Post('habit')
  async addHabit(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      habitType: string;
      loggedDate?: Date;
      note?: string;
    },
  ) {
    const userId = req.user.userId;
    if (!body.habitType) {
      throw new BadRequestException('habitType is required');
    }
    return await this.healthProfileService.addHabitLog(userId, body.habitType, body.loggedDate, body.note);
  }

  @Get('wellness')
  async getWellness(@Req() req: AuthedRequest) {
    const userId = req.user.userId;
    return await this.healthProfileService.getWellnessSnapshot(userId);
  }

  @Get('summary')
  async getSummary(@Req() req: AuthedRequest, @Query('period') period: 'week' | 'month' = 'week') {
    const userId = req.user.userId;
    if (!['week', 'month'].includes(period)) {
      throw new BadRequestException('period must be "week" or "month"');
    }
    return await this.healthProfileService.getSummary(userId, period);
  }

  @Post('consent')
  async giveConsent(@Req() req: AuthedRequest) {
    const userId = req.user.userId;
    return await this.healthProfileService.updateConsent(userId, true);
  }

  @Post('revoke-consent')
  async revokeConsent(@Req() req: AuthedRequest) {
    const userId = req.user.userId;
    return await this.healthProfileService.updateConsent(userId, false);
  }

  @Get('export')
  async exportData(@Req() req: AuthedRequest, @Body() body?: { format?: 'json' | 'csv' }) {
    const userId = req.user.userId;
    const format = body?.format || 'json';
    
    try {
      return await this.healthProfileService.exportUserData(userId, format);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
