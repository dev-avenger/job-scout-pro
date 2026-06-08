import { Routes, Route, Navigate } from 'react-router-dom';

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
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/onboarding/*" element={<OnboardingWizard />} />
        <Route path="/jobs/queue" element={<JobQueue />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/resume" element={<ResumeBuilder />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
