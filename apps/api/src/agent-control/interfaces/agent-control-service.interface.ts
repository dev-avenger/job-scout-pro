export interface IAgentControlService {
  getStatus(userId: string): Promise<{ status: string; pausedAt: string | null }>;
  pause(userId: string): Promise<{ status: string }>;
  resume(userId: string): Promise<{ status: string }>;
  kill(userId: string): Promise<{ status: string; message: string }>;
  getQueueStats?(userId: string): Promise<{ queues: unknown[] }>;
  exportData?(userId: string): Promise<{ status: string; message: string }>;
  deleteData?(userId: string): Promise<{ status: string }>;
}
