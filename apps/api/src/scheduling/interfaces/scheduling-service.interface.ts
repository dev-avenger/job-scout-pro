export interface ISchedulingService {
  enqueue(queueName: string, jobName: string, data: Record<string, unknown>, options?: { delay?: number; priority?: number; attempts?: number }): Promise<{ jobId: string | undefined }>;
  getQueueStats(): Promise<Record<string, { waiting: number; active: number; completed: number; failed: number }>>;
}
