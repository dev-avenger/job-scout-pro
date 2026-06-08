import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async check() {
    return this.healthService.check();
  }
}
