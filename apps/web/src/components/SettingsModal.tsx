import { Settings as SettingsIcon } from 'lucide-react';
import { Settings } from '../pages/Settings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

/** Full settings experience rendered inside a large scrollable dialog. */
export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SettingsIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Settings</DialogTitle>
              <DialogDescription className="text-xs">
                Manage your preferences, integrations, and account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Settings embedded />
        </div>
      </DialogContent>
    </Dialog>
  );
}
