import { Module } from '@nestjs/common';
import { OutreachController } from './outreach.controller.js';
import { OutreachService } from './outreach.service.js';
import { OutreachRepository } from './outreach.repository.js';
import { OUTREACH_SERVICE, OUTREACH_REPOSITORY } from './outreach.constants.js';

@Module({
  controllers: [OutreachController],
  providers: [
    { provide: OUTREACH_REPOSITORY, useClass: OutreachRepository },
    { provide: OUTREACH_SERVICE, useClass: OutreachService },
  ],
  exports: [OUTREACH_SERVICE],
})
export class OutreachModule {}
