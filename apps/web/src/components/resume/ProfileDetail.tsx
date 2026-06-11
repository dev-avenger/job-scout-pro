import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Mail,
  Phone,
  MapPin,
  Link2 as Linkedin,
  Star,
  Loader2,
  ArrowLeft,
  Pencil,
  PanelRightOpen,
  PanelRightClose,
  Download,
  Copy,
  FileJson,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';
import { DraggableSectionList } from './DraggableSectionList';
import { LiveResumePreview } from './LiveResumePreview';
import { TemplateSelector } from './TemplateSelector';
import { SectionEditors } from './SectionEditors';
import { AiGenerateDialog } from './AiGenerateDialog';
import { ResumeVersionsPanel } from './ResumeVersionsPanel';
import { CreateVersionDialog } from './CreateVersionDialog';
import { CoverLetterPanel } from './CoverLetterPanel';
import { JobMatchPanel } from './JobMatchPanel';
import { AtsScoreSidebar } from './AtsScoreSidebar';
import type { Profile } from '../../types/resume';

export function ProfileDetail({
  profile,
  onEdit,
  onBack,
}: {
  profile: Profile;
  onEdit: () => void;
  onBack: () => void;
}) {
  const [fullProfile, setFullProfile] = useState<Profile | null>(null);
  const [cloning, setCloning] = useState(false);

  const { showPreview, setShowPreview, initFromProfile, selectedLayout, selectedTheme } = useResumeBuilderStore();

  const refetchProfile = useCallback(() => {
    apiClient.get<Profile>(`/profiles/${profile.id}`).then(setFullProfile).catch(() => {});
  }, [profile.id]);

  useEffect(() => {
    refetchProfile();
    initFromProfile(profile.sectionOrder);
  }, [profile.id]);

  const handleExport = async (format: 'pdf' | 'docx') => {
    const safeName = profile.name.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = format === 'pdf' ? 'pdf' : 'docx';
    await apiClient.downloadBlob(
      `/profiles/${profile.id}/export/${format}?layout=${selectedLayout}&theme=${selectedTheme}`,
      `${safeName}_resume.${ext}`,
    );
  };

  const handleExportJson = async () => {
    try {
      const data = await apiClient.get(`/profiles/${profile.id}/export/json`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  const handleClone = async () => {
    setCloning(true);
    try {
      await apiClient.post(`/profiles/${profile.id}/clone`);
    } catch {
      // silently fail
    } finally {
      setCloning(false);
    }
  };

  const contactFields = [
    { icon: Mail, label: 'Email', value: profile.contactInfo?.email },
    { icon: Phone, label: 'Phone', value: profile.contactInfo?.phone },
    { icon: MapPin, label: 'Location', value: profile.contactInfo?.location },
    { icon: Linkedin, label: 'LinkedIn', value: profile.contactInfo?.linkedin },
  ].filter((f) => f.value);

  const skillLabels = profile.skills?.map(s => typeof s === 'string' ? s : s.name) ?? [];

  const profileContent = (
    <Card className="animate-fade-in border-0 shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl">{profile.name}</CardTitle>
              {profile.isDefault && (
                <Badge variant="warning" className="gap-1">
                  <Star className="h-3 w-3" />
                  Default
                </Badge>
              )}
            </div>
            <CardDescription className="pl-11">
              Created {new Date(profile.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" asChild>
              <Link to={`/resume/${profile.id}/builder`}>Open page builder</Link>
            </Button>
            <Button
              size="sm"
              variant={showPreview ? 'default' : 'outline'}
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1.5"
            >
              {showPreview ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              Page Builder
            </Button>
            <AiGenerateDialog profileId={profile.id} onSuccess={refetchProfile} />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleExportJson}
            >
              <FileJson className="h-4 w-4" />
              JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleClone}
              disabled={cloning}
            >
              {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Clone
            </Button>
            <Button size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6 space-y-6">
        {/* Contact Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
            Contact Information
          </h3>
          {contactFields.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {contactFields.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contact information provided.</p>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
            Summary
          </h3>
          {profile.summary ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {profile.summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No summary provided.</p>
          )}
        </div>

        {/* Skills */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
            Skills
          </h3>
          {skillLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skillLabels.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills listed.</p>
          )}
        </div>

        {/* Section Editors + Extras */}
        <Separator />
        <Tabs defaultValue="sections">
          <TabsList>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
            <TabsTrigger value="job-match">Job Match</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>
          <TabsContent value="sections" className="pt-4">
            <SectionEditors profileId={profile.id} onDataChange={refetchProfile} />
          </TabsContent>
          <TabsContent value="cover-letter" className="pt-4">
            <CoverLetterPanel profileId={profile.id} />
          </TabsContent>
          <TabsContent value="job-match" className="pt-4">
            <JobMatchPanel profileId={profile.id} />
          </TabsContent>
          <TabsContent value="versions" className="pt-4 space-y-3">
            <CreateVersionDialog profileId={profile.id} />
            <ResumeVersionsPanel profileId={profile.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  if (!showPreview) return profileContent;

  // Page Builder mode: split into left panel (controls) + right panel (preview)
  const previewData = fullProfile ?? profile;

  return (
    <div className="flex gap-4 animate-fade-in">
      {/* Left panel: controls */}
      <div className="w-[40%] shrink-0 space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 pb-4">
            <DraggableSectionList />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 pb-4">
            <TemplateSelector />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleExport('docx')}>
            <Download className="h-4 w-4" />
            Export DOCX
          </Button>
        </div>

        <AtsScoreSidebar profileId={profile.id} />

        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 pb-4">
            <SectionEditors profileId={profile.id} onDataChange={refetchProfile} />
          </CardContent>
        </Card>
      </div>

      {/* Right panel: live preview */}
      <div className="flex-1 min-w-0 sticky top-4 self-start">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold">{profile.name}</h2>
            {profile.isDefault && (
              <Badge variant="warning" className="gap-1 text-xs">
                <Star className="h-2.5 w-2.5" />
                Default
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowPreview(false)}>
              <PanelRightClose className="h-4 w-4" />
              Close Preview
            </Button>
            <Button size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <LiveResumePreview resumeData={previewData} />
        </ScrollArea>
      </div>
    </div>
  );
}
