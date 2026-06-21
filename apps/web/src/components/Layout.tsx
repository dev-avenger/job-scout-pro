import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { useThemeStore } from '../stores/theme-store';
import { useNotifications } from '../hooks/useNotifications';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  PenTool,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Bell,
  Globe,
  FolderOpen,
  UserCheck,
  DollarSign,
  Users,
  Activity,
  Bot,
  PauseCircle,
  Rocket,
  Sun,
  Moon,
  UserCog,
  ChevronsUpDown,
  Inbox as InboxIcon,
  Search,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { apiClient } from '../api/client';
import { OnboardingGate } from './OnboardingGate';
import { AccountModal } from './AccountModal';
import { SettingsModal } from './SettingsModal';
import { CommandPalette } from './CommandPalette';

const navigation = [
  {
    label: null,
    items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Pipeline',
    items: [
      { name: 'Jobs', path: '/jobs/queue', icon: Briefcase },
      { name: 'Applications', path: '/applications', icon: FileText },
      { name: 'Inbox', path: '/inbox', icon: InboxIcon },
      { name: 'Interviews', path: '/interviews', icon: UserCheck },
    ],
  },
  {
    label: 'Toolkit',
    items: [
      { name: 'Resume', path: '/resume', icon: PenTool },
      { name: 'Documents', path: '/documents', icon: FolderOpen },
      { name: 'Job Sources', path: '/job-sources', icon: Globe },
      { name: 'Networking', path: '/networking', icon: Users },
      { name: 'Salary', path: '/salary', icon: DollarSign },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'AI Usage', path: '/ai-usage', icon: Bot },
      { name: 'Monitoring', path: '/monitoring', icon: Activity },
    ],
  },
];

const flatNavigation = navigation.flatMap((group) => group.items);

// Pages reachable outside the sidebar still need a top-bar title
const extraPageTitles: Array<{ name: string; path: string }> = [
  { name: 'Settings', path: '/settings' },
  { name: 'Setup Wizard', path: '/onboarding' },
  { name: 'Notifications', path: '/notifications' },
];

function isPathActive(path: string, pathname: string) {
  return path === '/' ? pathname === '/' : pathname.startsWith(path);
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { unreadCount } = useNotifications();
  const [isPaused, setIsPaused] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const currentPage =
    flatNavigation.find((item) => isPathActive(item.path, location.pathname)) ??
    extraPageTitles.find((item) => isPathActive(item.path, location.pathname));

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const handlePause = async () => {
    try {
      await apiClient.post('/agent/pause');
      setIsPaused(true);
    } catch {}
  };

  const handleResume = async () => {
    try {
      await apiClient.post('/agent/resume');
      setIsPaused(false);
    } catch {}
  };

  /* Profile dropdown shared by the sidebar footer, top bar, and mobile bar */
  function ProfileMenu({ children }: { children: ReactNode }) {
    if (!user) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* Identity header */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-white shadow-sm shadow-primary/30">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{user.email}</p>
              <p className="text-[11px] text-muted-foreground capitalize">
                {user.autonomyMode} mode
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAccountOpen(true)} className="gap-2.5">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            Account preferences
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="gap-2.5">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/onboarding')} className="gap-2.5">
            <Rocket className="h-4 w-4 text-muted-foreground" />
            Setup Wizard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} className="gap-2.5">
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="gap-2.5 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="min-h-screen flex">
      <OnboardingGate />
      <AccountModal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar z-30">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2.5 px-6 py-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-primary shadow-md shadow-primary/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gradient">JobScout Pro</h1>
              <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">
                AI-Powered Job Search
              </p>
            </div>
          </div>

          {/* Agent control */}
          <div className="px-4 pb-2">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="w-full flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Agent paused — click to resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="w-full flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
                title="Click to pause the agent"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Agent active
                <PauseCircle className="w-3.5 h-3.5 ml-auto opacity-60" />
              </button>
            )}
          </div>

          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            {navigation.map((group, groupIdx) => (
              <div key={group.label ?? groupIdx} className={cn(groupIdx > 0 && 'mt-5')}>
                {group.label && (
                  <div className="flex items-center gap-2 px-3 pb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-sidebar-border/80" />
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isPathActive(item.path, location.pathname);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'group relative flex items-center gap-3 px-2.5 py-[7px] rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-0.5',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary transition-all duration-200',
                            isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50',
                          )}
                        />
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200',
                            isActive
                              ? 'bg-primary/15 text-primary'
                              : 'text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Profile footer */}
          <div className="px-3 pb-4 pt-2 border-t border-sidebar-border">
            {user && (
              <ProfileMenu>
                <button
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-sidebar-accent/40 transition-colors hover:bg-sidebar-accent text-left"
                  title="Account menu"
                >
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full gradient-primary text-white text-xs font-semibold shadow-sm shadow-primary/30">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize -mt-0.5">
                      {user.autonomyMode} mode
                    </p>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                </button>
              </ProfileMenu>
            )}
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <div className="hidden md:flex fixed top-0 left-64 right-0 z-20 bg-background/80 backdrop-blur-md border-b px-6 py-3 items-center justify-between">
        <p className="text-sm font-semibold text-foreground/80">{currentPage?.name ?? ''}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaletteOpen(true)}
            title="Search (Ctrl/⌘ + K)"
            className="mr-1 hidden lg:flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>
          <button
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>
          <Link
            to="/notifications"
            className="relative p-2 rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[9px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Link>
          {user && (
            <ProfileMenu>
              <button
                title="Account menu"
                className="ml-1 flex items-center justify-center w-8 h-8 rounded-full gradient-primary text-white text-xs font-semibold shadow-sm shadow-primary/30 transition-transform hover:scale-105"
              >
                {user.email.charAt(0).toUpperCase()}
              </button>
            </ProfileMenu>
          )}
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar/90 backdrop-blur-md border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary shadow-sm shadow-primary/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-gradient">JobScout Pro</span>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/notifications" className="relative p-1.5">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[8px]">
                {unreadCount}
              </Badge>
            )}
          </Link>
          {user && (
            <ProfileMenu>
              <button className="flex items-center justify-center w-7 h-7 rounded-full gradient-primary text-white text-[10px] font-semibold shadow-sm">
                {user.email.charAt(0).toUpperCase()}
              </button>
            </ProfileMenu>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border">
        <nav className="flex items-center justify-around px-2 py-1.5">
          {flatNavigation.slice(0, 5).map((item) => {
            const isActive = isPathActive(item.path, location.pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 bg-background">
        <div className="min-h-screen md:min-h-0">
          <div className="pt-16 pb-20 md:pt-14 md:pb-0 h-full overflow-auto">
            <div className="animate-fade-in">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
