import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { ApplicationStatus } from '@auto-job-apply/shared-types';
import { APPLICATION_REPOSITORY } from './application.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IApplicationRepository } from './interfaces/application-repository.interface.js';
import type { IApplicationService } from './interfaces/application-service.interface.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';

const logger = createLogger({ name: 'application-service' });

@Injectable()
export class ApplicationService implements IApplicationService {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly repo: IApplicationRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async list(userId: string, params: { page: number; limit: number; status?: string }) {
    const { items, total } = await this.repo.list(userId, params);
    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async getById(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async queue(userId: string, jobId: string, autonomyMode: string) {
    const idempotencyKey = `${userId}:${jobId}`;
    const existing = await this.repo.findByIdempotencyKey(idempotencyKey);

    if (existing) {
      return { id: existing.id, alreadyExists: true };
    }

    const id = generateId();
    await this.repo.create({
      id,
      userId,
      jobId,
      status: 'queued',
      idempotencyKey,
      autonomyMode,
    });

    await this.repo.recordEvent({
      id: generateId(),
      applicationId: id,
      eventType: 'status_changed',
      oldValue: undefined,
      newValue: 'queued',
    });

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'application.queued',
      data: { applicationId: id, jobId },
    });

    return { id, alreadyExists: false };
  }

  async updateStatus(userId: string, applicationId: string, newStatus: ApplicationStatus) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');

    const oldStatus = app.status;
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'submitted') updateData.submittedAt = new Date();
    if (newStatus === 'confirmed') updateData.confirmedAt = new Date();

    await this.repo.updateStatus(applicationId, updateData);

    await this.repo.recordEvent({
      id: generateId(),
      applicationId,
      eventType: 'status_changed',
      oldValue: oldStatus,
      newValue: newStatus,
    });

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'application.status_changed',
      data: { applicationId, from: oldStatus, to: newStatus },
    });
  }

  async approve(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'queued') throw new BadRequestException('Can only approve queued applications');
    await this.updateStatus(userId, applicationId, 'in_progress');
  }

  async reject(userId: string, applicationId: string) {
    await this.updateStatus(userId, applicationId, 'withdrawn');
  }

  async retry(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'failed') throw new BadRequestException('Can only retry failed applications');

    await this.repo.updateStatus(applicationId, {
      status: 'queued',
      retryCount: (app.retryCount || 0) + 1,
      failureReason: null,
      failureType: null,
      updatedAt: new Date(),
    });

    await this.repo.recordEvent({
      id: generateId(),
      applicationId,
      eventType: 'status_changed',
      oldValue: 'failed',
      newValue: 'queued',
    });
  }

  async getReviewQueue(userId: string) {
    return this.repo.getReviewQueue(userId);
  }

  async getDeadLetter(userId: string) {
    return this.repo.getDeadLetter(userId);
  }
}
