import { Controller, Get, Post, Delete, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { AGENT_CONTROL_SERVICE } from './agent-control.constants.js';
import type { IAgentControlService } from './interfaces/agent-control-service.interface.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class AgentControlController {
  constructor(@Inject(AGENT_CONTROL_SERVICE) private readonly agentControlService: IAgentControlService) {}

  @Get('agent/status')
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.agentControlService.getStatus(user.sub);
  }

  @Post('agent/pause')
  async pause(@CurrentUser() user: JwtPayload) {
    return this.agentControlService.pause(user.sub);
  }

  @Post('agent/resume')
  async resume(@CurrentUser() user: JwtPayload) {
    return this.agentControlService.resume(user.sub);
  }

  @Post('agent/kill')
  async kill(@CurrentUser() user: JwtPayload) {
    return this.agentControlService.kill(user.sub);
  }

  @Post('data/export')
  async exportData() {
    return {
      status: 'queued',
      message: 'Data export has been queued. You will receive a download link via email.',
    };
  }

  @Delete('data/delete')
  async deleteData() {
    return {
      status: 'confirmation_required',
      message: 'Please confirm deletion by providing your password.',
    };
  }
}
