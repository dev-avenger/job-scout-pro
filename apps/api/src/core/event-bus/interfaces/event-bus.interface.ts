import type { DomainEvent, EventType } from '@auto-job-apply/shared-types';

export type EventHandler<T = DomainEvent> = (event: T) => Promise<void>;

export interface IEventBus {
  on<T extends DomainEvent>(eventType: EventType, handler: EventHandler<T>): void;
  emit(event: DomainEvent): Promise<void>;
}
