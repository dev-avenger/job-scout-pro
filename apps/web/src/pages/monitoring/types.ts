export interface LlmSpendData {
  daily: number;   // cents
  monthly: number; // cents
  total: number;   // cents
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export type QueueStats = Record<string, QueueMetrics>;

export interface LlmRequestEntry {
  id: string;
  agentName: string;
  taskType: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: string;
}

export interface AgentLogEntry {
  id: string;
  module: string;
  action: string;
  reasoning?: string;
  outcome?: string;
  inputSummary?: string;
  outputSummary?: string;
  createdAt: string;
}

export interface AgentStatus {
  status: string;
  pausedAt: string | null;
}

export const QUEUE_NAMES = [
  'job-search',
  'job-validation',
  'application',
  'outreach',
  'inbox-scan',
  'research',
  'follow-up',
  'maintenance',
] as const;

export const MODULE_COLORS: Record<string, string> = {
  'job-search': 'bg-blue-100 text-blue-700',
  'job-validation': 'bg-purple-100 text-purple-700',
  application: 'bg-green-100 text-green-700',
  outreach: 'bg-orange-100 text-orange-700',
  'inbox-scan': 'bg-yellow-100 text-yellow-700',
  research: 'bg-cyan-100 text-cyan-700',
  'follow-up': 'bg-pink-100 text-pink-700',
  maintenance: 'bg-gray-100 text-gray-700',
  agent: 'bg-indigo-100 text-indigo-700',
  system: 'bg-red-100 text-red-700',
};
