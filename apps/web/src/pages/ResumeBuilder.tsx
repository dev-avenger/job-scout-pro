import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Plus, ArrowLeft, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Profile, TemplatesData, ContactInfo, View } from '../types/resume';
import { ResumeBuilderSkeleton } from '../components/resume/ResumeBuilderSkeleton';
import { ResumeImportDialog } from '../components/resume/ResumeImportDialog';
import { ProfileForm } from '../components/resume/ProfileForm';
import { ProfileCard } from '../components/resume/ProfileCard';
import { ProfileDetail } from '../components/resume/ProfileDetail';
import { EmptyState } from '../components/resume/EmptyState';

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */

export function ResumeBuilder() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<TemplatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>('list');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  /* ---- Data fetching ---- */

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [profilesData, templatesData] = await Promise.all([
        apiClient.get<Profile[]>('/profiles'),
        apiClient.get<TemplatesData>('/resumes/templates'),
      ]);
      setProfiles(profilesData);
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resume builder data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Handlers ---- */

  const handleCreateProfile = async (data: {
    name: string;
    contactInfo: ContactInfo;
    isDefault: boolean;
    summary: string;
    skills: string[];
  }) => {
    const created = await apiClient.post<Profile>('/profiles', {
      name: data.name,
      contactInfo: data.contactInfo,
      isDefault: data.isDefault,
    });
    // Update with summary/skills if provided
    if (data.summary || data.skills.length > 0) {
      await apiClient.put(`/profiles/${created.id}`, {
        summary: data.summary,
        skills: data.skills,
      });
    }
    const fullProfile: Profile = {
      ...created,
      summary: data.summary,
      skills: data.skills,
    };
    setProfiles((prev) =>
      data.isDefault
        ? [...prev.map((p) => ({ ...p, isDefault: false })), fullProfile]
        : [...prev, fullProfile],
    );
    setSelectedProfileId(fullProfile.id);
    setView('detail');
  };

  const handleUpdateProfile = async (data: {
    name: string;
    contactInfo: ContactInfo;
    isDefault: boolean;
    summary: string;
    skills: string[];
  }) => {
    if (!selectedProfileId || !selectedProfile) return;
    await apiClient.put(`/profiles/${selectedProfileId}`, data);
    const updated: Profile = {
      ...selectedProfile,
      name: data.name,
      contactInfo: data.contactInfo,
      isDefault: data.isDefault,
      summary: data.summary,
      skills: data.skills,
    };
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === selectedProfileId) return updated;
        if (data.isDefault && p.isDefault) return { ...p, isDefault: false };
        return p;
      }),
    );
    setView('detail');
  };

  const handleDeleteProfile = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/profiles/${id}`);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedProfileId === id) {
        setSelectedProfileId(null);
        setView('list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    setView('detail');
  };

  const handleEditProfile = (id: string) => {
    setSelectedProfileId(id);
    setView('edit');
  };

  /* ---- Loading state ---- */

  if (loading) {
    return <ResumeBuilderSkeleton />;
  }

  /* ---- Full-page error state ---- */

  if (error && profiles.length === 0 && !templates) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md animate-fade-in border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <FileText className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">Error loading resume builder</CardTitle>
            <CardDescription className="text-destructive/80">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Main panel content ---- */

  const renderMainPanel = () => {
    switch (view) {
      case 'create':
        return (
          <Card className="animate-fade-in border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView('list')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-xl">Create New Profile</CardTitle>
                  <CardDescription>
                    Fill in your information to create a resume profile.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <ProfileForm
                onSubmit={handleCreateProfile}
                onCancel={() => setView('list')}
                submitLabel="Create Profile"
              />
            </CardContent>
          </Card>
        );

      case 'edit':
        if (!selectedProfile) return null;
        return (
          <Card className="animate-fade-in border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView('detail')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-xl">Edit Profile</CardTitle>
                  <CardDescription>
                    Update your profile details and contact information.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <ProfileForm
                key={selectedProfile.id}
                initial={selectedProfile}
                onSubmit={handleUpdateProfile}
                onCancel={() => setView('detail')}
                submitLabel="Save Changes"
              />
            </CardContent>
          </Card>
        );

      case 'detail':
        if (!selectedProfile) return <EmptyState />;
        return (
          <ProfileDetail
            profile={selectedProfile}
            onEdit={() => setView('edit')}
            onBack={() => {
              setSelectedProfileId(null);
              setView('list');
            }}
          />
        );

      default:
        return <EmptyState />;
    }
  };

  /* ---- Render ---- */

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Resume Builder</h1>
          <p className="text-muted-foreground">
            Manage your profiles and resume templates. Import a resume to auto-fill your profile —
            then edit anything manually.
          </p>
        </div>
        {profiles.length > 0 && (
          <ResumeImportDialog
            profileId={selectedProfileId ?? profiles[0]!.id}
            onImported={() => fetchData()}
          />
        )}
      </div>

      {/* Inline error banner */}
      {error && (
        <div className="animate-fade-in flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/80"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Two-column layout: sidebar + main */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Sidebar */}
        <div className="w-full shrink-0 space-y-3 lg:w-80">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Profiles ({profiles.length})
            </h2>
          </div>

          {/* Profile list */}
          <div className="space-y-2">
            {profiles.map((profile, i) => (
              <div
                key={profile.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <ProfileCard
                  profile={profile}
                  isSelected={selectedProfileId === profile.id}
                  onSelect={() => handleSelectProfile(profile.id)}
                  onEdit={() => handleEditProfile(profile.id)}
                  onDelete={() => handleDeleteProfile(profile.id)}
                  deleting={deletingId === profile.id}
                />
              </div>
            ))}
          </div>

          {/* Create Profile button */}
          <Button
            className="w-full"
            onClick={() => {
              setSelectedProfileId(null);
              setView('create');
            }}
          >
            <Plus className="h-4 w-4" />
            Create Profile
          </Button>
        </div>

        {/* Main Area */}
        <div className="flex-1 min-w-0">{renderMainPanel()}</div>
      </div>

    </div>
  );
}
