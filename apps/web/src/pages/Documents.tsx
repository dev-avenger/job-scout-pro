import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FolderOpen, Upload, FileText, Download } from 'lucide-react';

export function Documents() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents Library</h1>
          <p className="text-muted-foreground mt-1">Manage resumes, cover letters, and exported documents</p>
        </div>
        <Button><Upload className="w-4 h-4 mr-2" />Upload Document</Button>
      </div>

      <Card className="p-8 text-center text-muted-foreground">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <h3 className="font-semibold text-foreground mb-2">No documents yet</h3>
        <p className="text-sm">Documents generated from resume tailoring and cover letter generation will appear here.</p>
      </Card>
    </div>
  );
}
