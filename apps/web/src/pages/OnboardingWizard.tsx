import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { apiClient } from '../api/client';
import {
  Upload,
  User,
  Settings,
  Eye,
  Key,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  MapPin,
  Briefcase,
  DollarSign,
  Monitor,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RemotePreference = 'remote' | 'hybrid' | 'onsite' | 'any';
type AutonomyMode = 'guided' | 'supervised' | 'autonomous';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  skills: string;
}

interface PreferencesForm {
  targetRoles: string[];
  targetLocations: string[];
  salaryMin: string;
  salaryMax: string;
  remotePreference: RemotePreference;
  dailyApplicationCap: string;
}

interface PortalCredential {
  siteName: string;
  username: string;
  password: string;
}

interface DryRunResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: 'Profile', icon: User },
  { label: 'Preferences', icon: Settings },
  { label: 'Dry Run', icon: Eye },
  { label: 'Credentials', icon: Key },
  { label: 'Autonomy', icon: Shield },
] as const;

const AUTONOMY_OPTIONS: {
  mode: AutonomyMode;
  title: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    mode: 'guided',
    title: 'Guided',
    description:
      'You manually review and approve each application before it is submitted. Maximum control over every action.',
    icon: Eye,
  },
  {
    mode: 'supervised',
    title: 'Supervised',
    description:
      'The agent auto-applies on your behalf but surfaces each application for post-submission review. You can withdraw if needed.',
    icon: Monitor,
  },
  {
    mode: 'autonomous',
    title: 'Autonomous',
    description:
      'Full autopilot. The agent searches, matches, applies, and follows up entirely on its own using your configured rules.',
    icon: Shield,
  },
];

const OPTIONAL_STEPS = new Set([3, 4]);

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300 border-2',
                  isCompleted &&
                    'bg-primary border-primary text-primary-foreground shadow-md',
                  isCurrent &&
                    'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25',
                  !isCompleted &&
                    !isCurrent &&
                    'bg-muted border-muted-foreground/20 text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium transition-colors duration-300',
                  isCompleted || isCurrent
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-10 sm:w-16 h-0.5 mx-2 mb-6 rounded-full transition-colors duration-500',
                  stepNum < currentStep
                    ? 'bg-primary'
                    : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-Input Component
// ---------------------------------------------------------------------------

function MultiInput({
  label,
  values,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  icon: typeof Briefcase;
}) {
  const [inputValue, setInputValue] = useState('');

  const addValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addValue();
              }
            }}
            placeholder={placeholder}
            className="pl-10"
          />
        </div>
        <Button type="button" variant="outline" size="default" onClick={addValue}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((val, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1 pr-1">
              {val}
              <button
                type="button"
                onClick={() => removeValue(idx)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <span className="sr-only">Remove</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    summary: '',
    skills: '',
  });

  // Step 2: Preferences
  const [preferences, setPreferences] = useState<PreferencesForm>({
    targetRoles: [],
    targetLocations: [],
    salaryMin: '',
    salaryMax: '',
    remotePreference: 'any',
    dailyApplicationCap: '10',
  });

  // Step 3: Dry Run
  const [dryRunResults, setDryRunResults] = useState<DryRunResult[] | null>(
    null,
  );
  const [dryRunLoading, setDryRunLoading] = useState(false);

  // Step 4: Credentials
  const [credentials, setCredentials] = useState<PortalCredential[]>([
    { siteName: '', username: '', password: '' },
  ]);

  // Step 5: Autonomy
  const [selectedMode, setSelectedMode] = useState<AutonomyMode | null>(null);

  // -------------------------------------------------------------------------
  // Dropzone
  // -------------------------------------------------------------------------

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setResumeFile(acceptedFiles[0] ?? null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // -------------------------------------------------------------------------
  // Profile handlers
  // -------------------------------------------------------------------------

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------------------------
  // Preferences handlers
  // -------------------------------------------------------------------------

  const handlePreferencesChange = (
    field: keyof PreferencesForm,
    value: string | string[] | RemotePreference,
  ) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------------------------
  // Credentials handlers
  // -------------------------------------------------------------------------

  const handleCredentialChange = (
    index: number,
    field: keyof PortalCredential,
    value: string,
  ) => {
    setCredentials((prev) =>
      prev.map((cred, i) =>
        i === index ? { ...cred, [field]: value } : cred,
      ),
    );
  };

  const addCredential = () => {
    setCredentials((prev) => [
      ...prev,
      { siteName: '', username: '', password: '' },
    ]);
  };

  const removeCredential = (index: number) => {
    setCredentials((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------------------
  // Dry Run
  // -------------------------------------------------------------------------

  const runDrySearch = async () => {
    setDryRunLoading(true);
    setError(null);
    try {
      const results = await apiClient.post<DryRunResult[]>(
        '/jobs/search/run?dryRun=true',
        {
          targetRoles: preferences.targetRoles,
          targetLocations: preferences.targetLocations,
          salaryMin: preferences.salaryMin
            ? Number(preferences.salaryMin)
            : undefined,
          salaryMax: preferences.salaryMax
            ? Number(preferences.salaryMax)
            : undefined,
          remotePreference: preferences.remotePreference,
        },
      );
      setDryRunResults(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to run dry search',
      );
    } finally {
      setDryRunLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return !!(profile.name.trim() && profile.email.trim());
      case 2:
        return preferences.targetRoles.length > 0;
      case 3:
        return true; // optional
      case 4:
        return true; // optional
      case 5:
        return !!selectedMode;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step < 5) {
      setStep(step + 1);
      setError(null);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedMode) {
      setError('Please select an autonomy mode.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filteredCredentials = credentials.filter(
        (c) => c.siteName.trim() && c.username.trim(),
      );

      await apiClient.post('/onboarding/complete', {
        profile: {
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          location: profile.location.trim(),
          linkedin: profile.linkedin.trim(),
          summary: profile.summary.trim(),
          skills: profile.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        preferences: {
          targetRoles: preferences.targetRoles,
          targetLocations: preferences.targetLocations,
          salaryMin: preferences.salaryMin
            ? Number(preferences.salaryMin)
            : undefined,
          salaryMax: preferences.salaryMax
            ? Number(preferences.salaryMax)
            : undefined,
          remotePreference: preferences.remotePreference,
          dailyApplicationCap: Number(preferences.dailyApplicationCap) || 10,
        },
        credentials: filteredCredentials,
        autonomyMode: selectedMode,
        resumeFile: resumeFile?.name ?? null,
      });

      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete onboarding',
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render: Step 1 - Profile Import
  // -------------------------------------------------------------------------

  function renderProfileStep() {
    return (
      <Card className="shadow-lg border-0 shadow-black/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <User className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Import Your Profile</CardTitle>
          <CardDescription className="text-base">
            Upload your resume to auto-fill or enter your details manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {/* Resume Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Upload Resume
            </label>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50',
              )}
            >
              <input {...getInputProps()} />
              <Upload
                className={cn(
                  'w-8 h-8 mx-auto mb-2',
                  isDragActive ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              {resumeFile ? (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {resumeFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(resumeFile.size / 1024).toFixed(1)} KB - Click or drag to
                    replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isDragActive
                      ? 'Drop your resume here...'
                      : 'Drag and drop your resume, or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, or TXT
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              or fill in manually
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={profile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                placeholder="John Doe"
                className="pl-10"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                placeholder="john@example.com"
                className="pl-10"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone</label>
            <Input
              type="tel"
              value={profile.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={profile.location}
                onChange={(e) =>
                  handleProfileChange('location', e.target.value)
                }
                placeholder="San Francisco, CA"
                className="pl-10"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              LinkedIn URL
            </label>
            <Input
              value={profile.linkedin}
              onChange={(e) => handleProfileChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Professional Summary
            </label>
            <textarea
              value={profile.summary}
              onChange={(e) => handleProfileChange('summary', e.target.value)}
              placeholder="Brief summary of your experience and career goals..."
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none"
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Skills (comma-separated)
            </label>
            <Input
              value={profile.skills}
              onChange={(e) => handleProfileChange('skills', e.target.value)}
              placeholder="React, TypeScript, Node.js, Python..."
            />
            {profile.skills && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.skills
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Step 2 - Preferences
  // -------------------------------------------------------------------------

  function renderPreferencesStep() {
    return (
      <Card className="shadow-lg border-0 shadow-black/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Your Preferences</CardTitle>
          <CardDescription className="text-base">
            Tell us what you are looking for so the agent can search
            effectively.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {/* Target Roles */}
          <MultiInput
            label="Target Roles *"
            values={preferences.targetRoles}
            onChange={(vals) => handlePreferencesChange('targetRoles', vals)}
            placeholder="e.g. Frontend Engineer"
            icon={Briefcase}
          />

          {/* Target Locations */}
          <MultiInput
            label="Target Locations"
            values={preferences.targetLocations}
            onChange={(vals) =>
              handlePreferencesChange('targetLocations', vals)
            }
            placeholder="e.g. New York, NY"
            icon={MapPin}
          />

          {/* Salary Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Salary Range (USD)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={preferences.salaryMin}
                  onChange={(e) =>
                    handlePreferencesChange('salaryMin', e.target.value)
                  }
                  placeholder="Min"
                  className="pl-10"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={preferences.salaryMax}
                  onChange={(e) =>
                    handlePreferencesChange('salaryMax', e.target.value)
                  }
                  placeholder="Max"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Remote Preference */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Remote Preference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'onsite', label: 'On-site' },
                  { value: 'any', label: 'Any' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    handlePreferencesChange('remotePreference', option.value)
                  }
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all',
                    preferences.remotePreference === option.value
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                      : 'border-input bg-background text-muted-foreground hover:border-primary/50',
                  )}
                >
                  <Monitor className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Application Cap */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Daily Application Cap
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={preferences.dailyApplicationCap}
              onChange={(e) =>
                handlePreferencesChange('dailyApplicationCap', e.target.value)
              }
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of applications the agent will submit per day.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Step 3 - Dry Run Preview
  // -------------------------------------------------------------------------

  function renderDryRunStep() {
    return (
      <Card className="shadow-lg border-0 shadow-black/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Eye className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Dry Run Preview</CardTitle>
          <CardDescription className="text-base">
            Preview what the agent will search for based on your profile and
            preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {/* Summary of search criteria */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Search Criteria
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Roles: </span>
                  <span className="text-foreground">
                    {preferences.targetRoles.length > 0
                      ? preferences.targetRoles.join(', ')
                      : 'Not specified'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Locations: </span>
                  <span className="text-foreground">
                    {preferences.targetLocations.length > 0
                      ? preferences.targetLocations.join(', ')
                      : 'Any'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Salary: </span>
                  <span className="text-foreground">
                    {preferences.salaryMin || preferences.salaryMax
                      ? `$${preferences.salaryMin || '0'} - $${preferences.salaryMax || 'Any'}`
                      : 'Any'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Remote: </span>
                  <span className="text-foreground capitalize">
                    {preferences.remotePreference}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <div className="flex justify-center">
            <Button
              onClick={runDrySearch}
              disabled={dryRunLoading}
              variant="outline"
              className="gap-2"
            >
              {dryRunLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Run Dry Search
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {dryRunResults && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Preview Results ({dryRunResults.length} jobs found)
              </h4>
              {dryRunResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No jobs matched your criteria. Try broadening your search
                    preferences.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dryRunResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.company} - {result.location}
                        </p>
                      </div>
                      {result.salary && (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {result.salary}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Step 4 - Credentials
  // -------------------------------------------------------------------------

  function renderCredentialsStep() {
    return (
      <Card className="shadow-lg border-0 shadow-black/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal Credentials</CardTitle>
          <CardDescription className="text-base">
            Optionally add login credentials for job portals so the agent can
            apply on your behalf. These are stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {credentials.map((cred, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Portal {idx + 1}
                </span>
                {credentials.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCredential(idx)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Site Name
                </label>
                <Input
                  value={cred.siteName}
                  onChange={(e) =>
                    handleCredentialChange(idx, 'siteName', e.target.value)
                  }
                  placeholder="e.g. LinkedIn, Workday, Greenhouse"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Username / Email
                  </label>
                  <Input
                    value={cred.username}
                    onChange={(e) =>
                      handleCredentialChange(idx, 'username', e.target.value)
                    }
                    placeholder="username@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={cred.password}
                    onChange={(e) =>
                      handleCredentialChange(idx, 'password', e.target.value)
                    }
                    placeholder="Password"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addCredential}
            className="w-full"
          >
            Add Another Portal
          </Button>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Step 5 - Autonomy Selection
  // -------------------------------------------------------------------------

  function renderAutonomyStep() {
    return (
      <Card className="shadow-lg border-0 shadow-black/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Choose Your Autonomy Level</CardTitle>
          <CardDescription className="text-base">
            How much control should the agent have over your applications?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {AUTONOMY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedMode === option.mode;

            return (
              <Card
                key={option.mode}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedMode(option.mode);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMode(option.mode);
                    setError(null);
                  }
                }}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                    : 'hover:border-muted-foreground/30',
                )}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div
                    className={cn(
                      'flex items-center justify-center w-11 h-11 rounded-lg shrink-0 transition-colors duration-200',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'font-semibold',
                          isSelected ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {option.title}
                      </p>
                      {isSelected && (
                        <Badge className="animate-fade-in">
                          <Check className="w-3 h-3 mr-1" />
                          Selected
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-sm',
                        isSelected
                          ? 'text-primary/80'
                          : 'text-muted-foreground',
                      )}
                    >
                      {option.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Step Content
  // -------------------------------------------------------------------------

  function renderStepContent() {
    switch (step) {
      case 1:
        return renderProfileStep();
      case 2:
        return renderPreferencesStep();
      case 3:
        return renderDryRunStep();
      case 4:
        return renderCredentialsStep();
      case 5:
        return renderAutonomyStep();
      default:
        return null;
    }
  }

  // -------------------------------------------------------------------------
  // Main Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <StepIndicator currentStep={step} />

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <div key={`step-${step}`} className="animate-fade-in">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={goBack}
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {OPTIONAL_STEPS.has(step) && step < 5 && (
              <Button variant="ghost" onClick={goNext} disabled={loading}>
                Skip
              </Button>
            )}

            {step < 5 ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext() || loading}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canGoNext() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
