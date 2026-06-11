import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller.js';
import { TemplatesRepository } from './templates.repository.js';

@Module({
  controllers: [TemplatesController],
  providers: [TemplatesRepository],
  exports: [TemplatesRepository],
})
export class TemplatesModule {}
