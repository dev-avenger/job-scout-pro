import { z } from 'zod';

export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  userId: z.string().uuid(),
});

export const JobDiscoveredEvent = BaseEventSchema.extend({
  type: z.literal('job.discovered'),
  data: z.object({
    jobId: z.string().uuid(),
    source: z.string(),
    title: z.string(),
    company: z.string(),
  }),
});

export const JobValidatedEvent = BaseEventSchema.extend({
  type: z.literal('job.validated'),
  data: z.object({
    jobId: z.string().uuid(),
    status: z.string(),
    reason: z.string().optional(),
  }),
});

export const JobExpiredEvent = BaseEventSchema.extend({
  type: z.literal('job.expired'),
  data: z.object({ jobId: z.string().uuid() }),
});

export const ApplicationQueuedEvent = BaseEventSchema.extend({
  type: z.literal('application.queued'),
  data: z.object({
    applicationId: z.string().uuid(),
    jobId: z.string().uuid(),
  }),
});

export const ApplicationStartedEvent = BaseEventSchema.extend({
  type: z.literal('application.started'),
  data: z.object({ applicationId: z.string().uuid() }),
});

export const ApplicationSubmittedEvent = BaseEventSchema.extend({
  type: z.literal('application.submitted'),
  data: z.object({
    applicationId: z.string().uuid(),
    portal: z.string(),
  }),
});

export const ApplicationConfirmedEvent = BaseEventSchema.extend({
  type: z.literal('application.confirmed'),
  data: z.object({ applicationId: z.string().uuid() }),
});

export const ApplicationFailedEvent = BaseEventSchema.extend({
  type: z.literal('application.failed'),
  data: z.object({
    applicationId: z.string().uuid(),
    failureType: z.string(),
    reason: z.string(),
  }),
});

export const ApplicationStatusChangedEvent = BaseEventSchema.extend({
  type: z.literal('application.status_changed'),
  data: z.object({
    applicationId: z.string().uuid(),
    from: z.string(),
    to: z.string(),
  }),
});

export const EmailReceivedEvent = BaseEventSchema.extend({
  type: z.literal('email.received'),
  data: z.object({
    emailId: z.string().uuid(),
    classification: z.string(),
    applicationId: z.string().uuid().optional(),
  }),
});

export const EmailSentEvent = BaseEventSchema.extend({
  type: z.literal('email.sent'),
  data: z.object({
    outreachId: z.string().uuid(),
    type: z.string(),
  }),
});

export const PortalMappedEvent = BaseEventSchema.extend({
  type: z.literal('portal.mapped'),
  data: z.object({
    domain: z.string(),
    fieldCount: z.number().int(),
  }),
});

export const PortalFailedEvent = BaseEventSchema.extend({
  type: z.literal('portal.failed'),
  data: z.object({
    domain: z.string(),
    error: z.string(),
  }),
});

export const CaptchaNeededEvent = BaseEventSchema.extend({
  type: z.literal('captcha.needed'),
  data: z.object({
    applicationId: z.string().uuid(),
    portal: z.string(),
  }),
});

export const CaptchaSolvedEvent = BaseEventSchema.extend({
  type: z.literal('captcha.solved'),
  data: z.object({
    applicationId: z.string().uuid(),
    method: z.string(),
  }),
});

export const InterviewDetectedEvent = BaseEventSchema.extend({
  type: z.literal('interview.detected'),
  data: z.object({
    applicationId: z.string().uuid(),
    date: z.string(),
    format: z.string(),
  }),
});

export const OfferReceivedEvent = BaseEventSchema.extend({
  type: z.literal('offer.received'),
  data: z.object({
    applicationId: z.string().uuid(),
    salary: z.number().optional(),
  }),
});

export const BudgetThresholdEvent = BaseEventSchema.extend({
  type: z.literal('budget.threshold'),
  data: z.object({
    period: z.enum(['daily', 'monthly']),
    percentage: z.number(),
  }),
});

export const BudgetExhaustedEvent = BaseEventSchema.extend({
  type: z.literal('budget.exhausted'),
  data: z.object({
    period: z.enum(['daily', 'monthly']),
    spent: z.number(),
    cap: z.number(),
  }),
});

export const AnswerLearnedEvent = BaseEventSchema.extend({
  type: z.literal('answer.learned'),
  data: z.object({
    fieldLabel: z.string(),
    source: z.string(),
  }),
});

export const UserActionEvent = BaseEventSchema.extend({
  type: z.literal('user.action'),
  data: z.object({
    action: z.string(),
    entityType: z.string(),
    entityId: z.string(),
  }),
});

export const DomainEventSchema = z.discriminatedUnion('type', [
  JobDiscoveredEvent,
  JobValidatedEvent,
  JobExpiredEvent,
  ApplicationQueuedEvent,
  ApplicationStartedEvent,
  ApplicationSubmittedEvent,
  ApplicationConfirmedEvent,
  ApplicationFailedEvent,
  ApplicationStatusChangedEvent,
  EmailReceivedEvent,
  EmailSentEvent,
  PortalMappedEvent,
  PortalFailedEvent,
  CaptchaNeededEvent,
  CaptchaSolvedEvent,
  InterviewDetectedEvent,
  OfferReceivedEvent,
  BudgetThresholdEvent,
  BudgetExhaustedEvent,
  AnswerLearnedEvent,
  UserActionEvent,
]);
export type DomainEvent = z.infer<typeof DomainEventSchema>;

export type EventType = DomainEvent['type'];
