import { useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAuthStore } from '../stores/auth-store';
import { apiClient } from '../api/client';
import { Zap, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    autonomyMode: string;
    onboardingCompleted: boolean;
  };
}

const features = [
  {
    icon: '🎯',
    title: 'Smart Job Matching',
    description: 'AI finds roles that perfectly fit your skills and preferences.',
  },
  {
    icon: '⚡',
    title: 'One-Click Apply',
    description: 'Automatically fill and submit applications in seconds.',
  },
  {
    icon: '📊',
    title: 'Real-Time Tracking',
    description: 'Monitor every application from submission to offer.',
  },
  {
    icon: '🤖',
    title: 'Resume Optimization',
    description: 'Tailor your resume for each job with AI assistance.',
  },
];

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await apiClient.post<AuthResponse>(endpoint, {
        email,
        password,
      });
      setAuth(res.accessToken, res.user, res.refreshToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-background dark:to-indigo-950/60 flex">
      {/* ── Left Hero Panel (lg+) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Decorative blurred circles */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-200/40 dark:bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-12 right-0 h-80 w-80 rounded-full bg-indigo-200/40 dark:bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-purple-200/30 dark:bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 max-w-lg animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">JobScout Pro</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            <span className="text-gradient">
              Land your dream job,
            </span>
            <br />
            <span className="text-foreground">faster than ever.</span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Let AI handle the tedious parts of job hunting so you can focus on
            what matters -- preparing for interviews and choosing the right
            opportunity.
          </p>

          <div className="mt-10 grid gap-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3 group">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm border border-border text-base group-hover:scale-110 transition-transform">
                  {f.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Card Panel ── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
          {/* Mobile-only branding */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">JobScout Pro</span>
          </div>

          <Card className="border-0 shadow-xl shadow-gray-200/50 dark:shadow-black/30 backdrop-blur-sm bg-white/80 dark:bg-card/80">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2 mb-1 lg:mb-0">
                <div className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {isRegister ? 'Create Account' : 'Welcome Back'}
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                {isRegister
                  ? 'Get started with your AI-powered job search'
                  : 'Sign in to continue your job search journey'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground/80"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-11 bg-muted/50 border-input focus-visible:ring-primary focus-visible:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground/80"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        isRegister ? 'Min 8 characters' : 'Enter your password'
                      }
                      className="pl-10 h-11 bg-muted/50 border-input focus-visible:ring-primary focus-visible:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Error alert */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full h-11 text-sm font-semibold',
                    'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
                    'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
                    'transition-all duration-200',
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    <>
                      {isRegister ? 'Create Account' : 'Sign In'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle link */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {isRegister
                  ? 'Already have an account?'
                  : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="font-semibold text-primary hover:opacity-80 underline-offset-4 hover:underline transition-all"
                >
                  {isRegister ? 'Sign in' : 'Create one'}
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground/70">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
