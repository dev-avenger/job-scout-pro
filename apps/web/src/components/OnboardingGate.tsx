import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useAuthStore } from '../stores/auth-store';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

const DISMISS_KEY = 'onboarding-gate-dismissed';

/**
 * Shown after login for users who have not completed the onboarding wizard.
 * "Later" hides it for the rest of the browser session; it reappears on the
 * next login until onboarding is actually completed.
 */
export function OnboardingGate() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  const onWizard = location.pathname.startsWith('/onboarding');
  const open = Boolean(user) && !user!.onboardingCompleted && !dismissed && !onWizard;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleStart = () => {
    navigate('/onboarding');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Finish setting up your job search</DialogTitle>
          <DialogDescription className="text-center">
            Tell us your target roles and preferences so the agent can start
            finding and applying to jobs for you. It only takes a few minutes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleStart}>Start setup</Button>
          <Button variant="ghost" onClick={handleDismiss}>
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
