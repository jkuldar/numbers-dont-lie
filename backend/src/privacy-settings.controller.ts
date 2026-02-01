import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  UseGuards, 
  Req, 
  BadRequestException 
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrivacySettingsService } from './privacy-settings.service';

@Controller('privacy-settings')
@UseGuards(JwtAuthGuard)
export class PrivacySettingsController {
  constructor(private privacySettingsService: PrivacySettingsService) {}

  @Get()
  async getSettings(@Req() req) {
    const userId = req.user.userId;
    return await this.privacySettingsService.getSettings(userId);
  }

  @Post()
  async createOrUpdateSettings(@Req() req, @Body() body: any) {
    const userId = req.user.userId;
    
    try {
      return await this.privacySettingsService.createOrUpdateSettings(userId, body);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Put()
  async updateSettings(@Req() req, @Body() body: any) {
    const userId = req.user.userId;
    
    try {
      return await this.privacySettingsService.updateSettings(userId, body);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
