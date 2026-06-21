import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Inbox as InboxIcon,
  UserCheck,
  PenTool,
  FolderOpen,
  Globe,
  Users,
  DollarSign,
  BarChart3,
  Bot,
  Activity,
  Bell,
  Settings as SettingsIcon,
  Search,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types — minimal shapes pulled from the existing list endpoints     */
/* ------------------------------------------------------------------ */

interface AppItem {
  id: string;
  jobTitle?: string | null;
  companyName?: string | null;
}
interface ContactItem {
  id: string;
  name: string;
  company?: string;
  title?: string;
}
interface JobItem {
  id: string;
  title: string;
  companyName: string;
}
interface Paginated<T> {
  items: T[];
}

/* ------------------------------------------------------------------ */
/*  Static page-navigation commands (mirrors the sidebar)              */
/* ------------------------------------------------------------------ */

const PAGES: Array<{ name: string; path: string; icon: typeof LayoutDashboard }> = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Jobs', path: '/jobs/queue', icon: Briefcase },
  { name: 'Applications', path: '/applications', icon: FileText },
  { name: 'Inbox', path: '/inbox', icon: InboxIcon },
  { name: 'Interviews', path: '/interviews', icon: UserCheck },
  { name: 'Resume', path: '/resume', icon: PenTool },
  { name: 'Documents', path: '/documents', icon: FolderOpen },
  { name: 'Job Sources', path: '/job-sources', icon: Globe },
  { name: 'Networking', path: '/networking', icon: Users },
  { name: 'Salary', path: '/salary', icon: DollarSign },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'AI Usage', path: '/ai-usage', icon: Bot },
  { name: 'Monitoring', path: '/monitoring', icon: Activity },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Settings', path: '/settings', icon: SettingsIcon },
];

const ITEM_CLS =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none ' +
  'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground';
const GROUP_CLS =
  'mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 ' +
  '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium ' +
  '[&_[cmdk-group-heading]]:text-muted-foreground';

/* ------------------------------------------------------------------ */
/*  Command palette                                                    */
/* ------------------------------------------------------------------ */

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Lazy-load searchable entities the first time the palette opens. Each source
  // is independent (allSettled) so one failing endpoint doesn't blank the rest.
  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    Promise.allSettled([
      apiClient.get<Paginated<AppItem>>('/applications?page=1&limit=100'),
      apiClient.get<ContactItem[]>('/contacts'),
      apiClient.get<Paginated<JobItem>>('/jobs?page=1&limit=100'),
    ])
      .then(([a, c, j]) => {
        if (a.status === 'fulfilled') setApps(a.value?.items ?? []);
        if (c.status === 'fulfilled') setContacts(Array.isArray(c.value) ? c.value : []);
        if (j.status === 'fulfilled') setJobs(j.value?.items ?? []);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [open, loaded]);

  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global command menu"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
      contentClassName="fixed left-1/2 top-[14%] z-50 w-[92vw] max-w-xl -translate-x-1/2"
      className="overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Command.Input
          autoFocus
          placeholder="Search pages, applications, contacts, jobs…"
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        {loading && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          No results found.
        </Command.Empty>

        <Command.Group heading="Pages" className={GROUP_CLS}>
          {PAGES.map((p) => {
            const Icon = p.icon;
            return (
              <Command.Item
                key={p.path}
                value={`page ${p.name}`}
                onSelect={() => go(p.path)}
                className={ITEM_CLS}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{p.name}</span>
              </Command.Item>
            );
          })}
        </Command.Group>

        {apps.length > 0 && (
          <Command.Group heading="Applications" className={GROUP_CLS}>
            {apps.map((a) => {
              const label = a.jobTitle || `Application ${a.id.slice(0, 8)}`;
              const sub = a.companyName || '';
              return (
                <Command.Item
                  key={a.id}
                  value={`application ${label} ${sub} ${a.id}`}
                  onSelect={() => go(`/applications/${a.id}`)}
                  className={ITEM_CLS}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                  {sub && (
                    <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{sub}</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {contacts.length > 0 && (
          <Command.Group heading="Contacts" className={GROUP_CLS}>
            {contacts.map((c) => {
              const sub = [c.title, c.company].filter(Boolean).join(' · ');
              return (
                <Command.Item
                  key={c.id}
                  value={`contact ${c.name} ${c.company ?? ''} ${c.title ?? ''}`}
                  onSelect={() => go('/networking')}
                  className={ITEM_CLS}
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                  {sub && (
                    <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{sub}</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {jobs.length > 0 && (
          <Command.Group heading="Jobs" className={GROUP_CLS}>
            {jobs.map((j) => (
              <Command.Item
                key={j.id}
                value={`job ${j.title} ${j.companyName} ${j.id}`}
                onSelect={() => go('/jobs/queue')}
                className={ITEM_CLS}
              >
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{j.title}</span>
                <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                  {j.companyName}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
