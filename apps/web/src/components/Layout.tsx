import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
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
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../api/client';

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Jobs', path: '/jobs/queue', icon: Briefcase },
  { name: 'Applications', path: '/applications', icon: FileText },
  { name: 'Resume', path: '/resume', icon: PenTool },
  { name: 'Job Sources', path: '/job-sources', icon: Globe },
  { name: 'Documents', path: '/documents', icon: FolderOpen },
  { name: 'Interviews', path: '/interviews', icon: UserCheck },
  { name: 'Salary', path: '/salary', icon: DollarSign },
  { name: 'Networking', path: '/networking', icon: Users },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Monitoring', path: '/monitoring', icon: Activity },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { unreadCount } = useNotifications();
  const [isPaused, setIsPaused] = useState(false);

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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar z-30">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2.5 px-6 py-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg gradient-primary shadow-md shadow-primary/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                JobScout Pro
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">
                AI-Powered Job Search
              </p>
            </div>
          </div>

          <Separator className="mx-4 w-auto" />

          {/* Agent controls */}
          <div className="px-3 py-2 flex items-center gap-2">
            {isPaused ? (
              <Button size="sm" variant="outline" onClick={handleResume} className="flex-1 text-xs">
                <Zap className="w-3 h-3 mr-1" /> Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handlePause} className="flex-1 text-xs text-yellow-600">
                <PauseCircle className="w-3 h-3 mr-1" /> Pause
              </Button>
            )}
          </div>

          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className={cn('w-[18px] h-[18px] transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-4 space-y-2">
            <Separator className="mb-2" />
            {user && (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}
            <Button variant="ghost" onClick={logout} className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-[18px] h-[18px]" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Top bar for notifications */}
      <div className="hidden md:flex fixed top-0 left-64 right-0 z-20 bg-background/80 backdrop-blur border-b px-6 py-3 items-center justify-end gap-4">
        <Link to="/notifications" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Link>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary shadow-sm shadow-primary/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">JobScout Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="relative p-1">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[8px]">{unreadCount}</Badge>}
          </Link>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border">
        <nav className="flex items-center justify-around px-2 py-1.5">
          {navigation.slice(0, 5).map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={cn('flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
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
