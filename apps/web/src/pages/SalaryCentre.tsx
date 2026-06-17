import { Card } from '../components/ui/card';
import { PageHeader } from '../components/PageHeader';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

const STATS = [
  {
    label: 'Avg. Salary (Found)',
    value: '--',
    icon: DollarSign,
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Salary Range',
    value: '--',
    icon: TrendingUp,
    chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Jobs with Salary Data',
    value: '0',
    icon: BarChart3,
    chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
] as const;

export function SalaryCentre() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Salary Centre"
        description="Salary insights and negotiation data from your job search"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="p-5 border-border/60 shadow-soft card-hover"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-11 h-11 rounded-lg shrink-0 ${stat.chip}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60 shadow-soft">
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <BarChart3 className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No salary data yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Salary data will be aggregated as you discover and apply to jobs.
          </p>
        </div>
      </Card>
    </div>
  );
}
