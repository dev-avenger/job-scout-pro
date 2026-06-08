import { Module } from '@nestjs/common';
import { AgentControlController } from './agent-control.controller.js';
import { AgentControlService } from './agent-control.service.js';
import { AGENT_CONTROL_SERVICE } from './agent-control.constants.js';

@Module({
  controllers: [AgentControlController],
  providers: [
    { provide: AGENT_CONTROL_SERVICE, useClass: AgentControlService },
  ],
  exports: [AGENT_CONTROL_SERVICE],
})
export class AgentControlModule {}
