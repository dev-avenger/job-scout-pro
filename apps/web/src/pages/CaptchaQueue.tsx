import { Card } from '../components/ui/card';
import { ShieldAlert } from 'lucide-react';

export function CaptchaQueue() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CAPTCHA Queue</h1>
        <p className="text-muted-foreground mt-1">Applications waiting for manual CAPTCHA resolution</p>
      </div>

      <Card className="p-8 text-center text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <h3 className="font-semibold text-foreground mb-2">No CAPTCHAs Pending</h3>
        <p className="text-sm">When an application encounters a CAPTCHA, it will appear here for you to solve.</p>
      </Card>
    </div>
  );
}
