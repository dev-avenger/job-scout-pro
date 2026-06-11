import { cn } from '../lib/utils';

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (score >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

export function ScoreCard({
  label,
  score,
  maxScore = 100,
  className,
}: {
  label: string;
  score: number;
  maxScore?: number;
  className?: string;
}) {
  const percentage = Math.round((score / maxScore) * 100);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getScoreColor(percentage))}>
        {percentage}%
      </span>
    </div>
  );
}
