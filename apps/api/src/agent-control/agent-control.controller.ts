import { Controller, Get, Post, Delete, UseGuards, Inject, Body } from '@nestjs/common';
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

  @Get('agent/queue-stats')
  async getQueueStats(@CurrentUser() user: JwtPayload) {
    return this.agentControlService.getQueueStats?.(user.sub) ?? {};
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
  async exportData(@CurrentUser() user: JwtPayload) {
    return this.agentControlService.exportData?.(user.sub) ?? { status: 'queued', message: 'Data export queued' };
  }

  @Delete('data/delete')
  async deleteData(@CurrentUser() user: JwtPayload, @Body() body: { confirmPassword?: string }) {
    return this.agentControlService.deleteData?.(user.sub) ?? { status: 'confirmation_required' };
  }
}
