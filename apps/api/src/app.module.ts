import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LlmModule } from './llm/llm.module.js';
import { SearchModule } from './search/search.module.js';
import { ResumeModule } from './resume/resume.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { ApplicationModule } from './application/application.module.js';
import { InboxModule } from './inbox/inbox.module.js';
import { OutreachModule } from './outreach/outreach.module.js';
import { ResearchModule } from './research/research.module.js';
import { SchedulingModule } from './scheduling/scheduling.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AgentControlModule } from './agent-control/agent-control.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { HealthModule } from './health/health.module.js';
import { WebsocketModule } from './websocket/websocket.module.js';
import { QueueModule } from './queue/queue.module.js';
import { EventHandlersModule } from './core/event-bus/event-handlers.module.js';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    LlmModule,
    SearchModule,
    ResumeModule,
    TemplatesModule,
    ApplicationModule,
    InboxModule,
    OutreachModule,
    ResearchModule,
    SchedulingModule,
    SettingsModule,
    NotificationsModule,
    AnalyticsModule,
    AgentControlModule,
    DocumentsModule,
    HealthModule,
    WebsocketModule,
    QueueModule,
    EventHandlersModule,
  ],
})
export class AppModule {}
