import { Card } from '../components/ui/card';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

export function SalaryCentre() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Salary Centre</h1>
        <p className="text-muted-foreground mt-1">Salary insights and negotiation data from your job search</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg. Salary (Found)</p>
              <p className="text-xl font-bold">--</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Salary Range</p>
              <p className="text-xl font-bold">--</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Jobs with Salary Data</p>
              <p className="text-xl font-bold">0</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8 text-center text-muted-foreground">
        <p className="text-sm">Salary data will be aggregated as you discover and apply to jobs.</p>
      </Card>
    </div>
  );
}
