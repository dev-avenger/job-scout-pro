import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion';
import {
  Briefcase,
  GraduationCap,
  FolderOpen,
  Award,
  Languages,
  BookOpen,
  Heart,
  UserPlus,
} from 'lucide-react';
import type { SectionType } from '../../types/resume';
import {
  ExperienceSection,
  EducationSection,
  ProjectsSection,
  CertificationsSection,
  LanguagesSection,
  PublicationsSection,
  VolunteerSection,
  ReferencesSection,
} from './sections';

const sections: {
  value: SectionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ profileId: string; onDataChange?: () => void }>;
}[] = [
  { value: 'experience', label: 'Experience', icon: Briefcase, component: ExperienceSection },
  { value: 'education', label: 'Education', icon: GraduationCap, component: EducationSection },
  { value: 'projects', label: 'Projects', icon: FolderOpen, component: ProjectsSection },
  { value: 'certifications', label: 'Certifications', icon: Award, component: CertificationsSection },
  { value: 'languages', label: 'Languages', icon: Languages, component: LanguagesSection },
  { value: 'publications', label: 'Publications', icon: BookOpen, component: PublicationsSection },
  { value: 'volunteer', label: 'Volunteer', icon: Heart, component: VolunteerSection },
  { value: 'references', label: 'References', icon: UserPlus, component: ReferencesSection },
];

export function SectionEditors({ profileId, onDataChange }: { profileId: string; onDataChange?: () => void }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
        Resume Sections
      </h3>
      <Accordion type="multiple" className="w-full">
        {sections.map(({ value, label, icon: Icon, component: Component }) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Component profileId={profileId} onDataChange={onDataChange} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
