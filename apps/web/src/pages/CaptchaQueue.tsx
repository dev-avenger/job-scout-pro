import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/PageHeader';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export function CaptchaQueue() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="CAPTCHA Queue"
        description="Applications waiting for manual CAPTCHA resolution"
      />

      <Card className="border-border/60 shadow-soft">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No CAPTCHAs pending</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            When an application encounters a CAPTCHA, it will appear here for you to solve.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            The agent pauses automatically whenever human verification is required.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
