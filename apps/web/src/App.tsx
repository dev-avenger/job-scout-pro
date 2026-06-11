import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import { useAuthStore } from './stores/auth-store';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { JobQueue } from './pages/JobQueue';
import { Applications } from './pages/Applications';
import { ResumeBuilder } from './pages/ResumeBuilder';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Layout } from './components/Layout';

// Lazy-loaded pages (Batch 3+)
const JobSources = lazy(() => import('./pages/JobSources').then(m => ({ default: m.JobSources })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const InterviewPrep = lazy(() => import('./pages/InterviewPrep').then(m => ({ default: m.InterviewPrep })));
const SalaryCentre = lazy(() => import('./pages/SalaryCentre').then(m => ({ default: m.SalaryCentre })));
const Networking = lazy(() => import('./pages/Networking').then(m => ({ default: m.Networking })));
const Monitoring = lazy(() => import('./pages/Monitoring').then(m => ({ default: m.Monitoring })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const CaptchaQueue = lazy(() => import('./pages/CaptchaQueue').then(m => ({ default: m.CaptchaQueue })));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail').then(m => ({ default: m.ApplicationDetail })));
const BuilderPage = lazy(() => import('./pages/BuilderPage').then(m => ({ default: m.BuilderPage })));

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
}

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/onboarding/*" element={<OnboardingWizard />} />
          <Route path="/jobs/queue" element={<JobQueue />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/resume" element={<ResumeBuilder />} />
          <Route path="/resume/:profileId/builder" element={<BuilderPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="/job-sources" element={<JobSources />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/interviews" element={<InterviewPrep />} />
          <Route path="/salary" element={<SalaryCentre />} />
          <Route path="/networking" element={<Networking />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/captcha-queue" element={<CaptchaQueue />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
