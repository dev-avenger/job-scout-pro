import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { FolderOpen, Upload, FileText, PenLine } from 'lucide-react';

export function Documents() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Documents Library"
        description="Manage resumes, cover letters, and exported documents"
        actions={
          <Button className="shadow-soft">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 border-border/60 shadow-soft card-hover">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Resumes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tailored resumes generated for each application
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border/60 shadow-soft card-hover">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
              <PenLine className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Cover Letters</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personalised cover letters written by the agent
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-border/60 shadow-soft">
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No documents yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Documents generated from resume tailoring and cover letter
            generation will appear here.
          </p>
          <Button variant="outline" className="mt-5">
            <Upload className="w-4 h-4 mr-2" />
            Upload your first document
          </Button>
        </div>
      </Card>
    </div>
  );
}
