export const QUEUE_CONFIGS = [
  { name: 'job-search', concurrency: 2 },
  { name: 'job-validation', concurrency: 5 },
  { name: 'application', concurrency: 1 },
  { name: 'outreach', concurrency: 2 },
  { name: 'inbox-scan', concurrency: 1 },
  { name: 'research', concurrency: 3 },
  { name: 'follow-up', concurrency: 2 },
  { name: 'maintenance', concurrency: 1 },
] as const;
