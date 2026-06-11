import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { AgentStatus, QueueStats, LlmSpendData, LlmRequestEntry, AgentLogEntry } from './types';

export function useAgentStatus() {
  return useQuery<AgentStatus>({
    queryKey: ['agent-status'],
    queryFn: () => apiClient.get('/agent/status'),
    refetchInterval: 10_000,
  });
}

export function useQueueStats() {
  return useQuery<QueueStats>({
    queryKey: ['queue-stats'],
    queryFn: () => apiClient.get('/agent/queue-stats'),
    refetchInterval: 15_000,
  });
}

export function useLlmSpend() {
  return useQuery<LlmSpendData>({
    queryKey: ['llm-spend'],
    queryFn: () => apiClient.get('/monitoring/llm/spend'),
    refetchInterval: 30_000,
  });
}

export function useLlmRequests() {
  return useQuery<LlmRequestEntry[]>({
    queryKey: ['llm-requests'],
    queryFn: () => apiClient.get('/monitoring/llm/requests'),
    refetchInterval: 15_000,
  });
}

export function useAgentLogs() {
  return useQuery<AgentLogEntry[]>({
    queryKey: ['agent-logs'],
    queryFn: () => apiClient.get('/monitoring/agent-log'),
    refetchInterval: 10_000,
  });
}

export function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['agent-status'] });
    queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
    queryClient.invalidateQueries({ queryKey: ['llm-spend'] });
    queryClient.invalidateQueries({ queryKey: ['llm-requests'] });
    queryClient.invalidateQueries({ queryKey: ['agent-logs'] });
  };
}
