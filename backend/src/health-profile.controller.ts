import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  UseGuards, 
  Req, 
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { HealthProfileService } from './health-profile.service';

@Controller('health-profile')
@UseGuards(JwtAuthGuard)
export class HealthProfileController {
  constructor(private healthProfileService: HealthProfileService) {}

  @Post()
  async createOrUpdateProfile(@Req() req, @Body() body: any) {
    const userId = req.user.userId;
    
    // Explicit consent check
    if (!body.consentGiven) {
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

  @Get()
  async getProfile(@Req() req) {
    const userId = req.user.userId;
    const profile = await this.healthProfileService.getProfile(userId);
    
    if (!profile) {
      throw new NotFoundException('Health profile not found');
    }
    
    return profile;
  }

  @Post('weight')
  async addWeightEntry(@Req() req, @Body() body: { weight: number; unit?: string; note?: string }) {
    const userId = req.user.userId;
    
    if (!body.weight || body.weight <= 0) {
      throw new BadRequestException('Valid weight required');
    }

    try {
      const weightKg = this.healthProfileService.convertWeightToKg(body.weight, body.unit || 'kg');
      return await this.healthProfileService.addWeightEntry(userId, weightKg, body.note);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('weight-history')
  async getWeightHistory(@Req() req) {
    const userId = req.user.userId;
    return await this.healthProfileService.getWeightHistory(userId);
  }

  @Post('consent')
  async giveConsent(@Req() req) {
    const userId = req.user.userId;
    return await this.healthProfileService.updateConsent(userId, true);
  }

  @Post('revoke-consent')
  async revokeConsent(@Req() req) {
    const userId = req.user.userId;
    return await this.healthProfileService.updateConsent(userId, false);
  }

  @Get('export')
  async exportData(@Req() req, @Body() body?: { format?: 'json' | 'csv' }) {
    const userId = req.user.userId;
    const format = body?.format || 'json';
    
    try {
      return await this.healthProfileService.exportUserData(userId, format);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
