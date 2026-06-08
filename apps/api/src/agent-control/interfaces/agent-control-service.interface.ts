export interface IAgentControlService {
  getStatus(userId: string): Promise<{ status: string; pausedAt: string | null }>;
  pause(userId: string): Promise<{ status: string }>;
  resume(userId: string): Promise<{ status: string }>;
  kill(userId: string): Promise<{ status: string; message: string }>;
}
