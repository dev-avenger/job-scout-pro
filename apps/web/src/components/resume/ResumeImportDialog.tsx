import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Upload, FileText, Loader2, Check, X } from 'lucide-react';
import { importResumeJson } from '@auto-job-apply/resume-import';
import { apiClient } from '../../api/client';

interface ResumeImportDialogProps {
  profileId: string;
  onImported?: () => void;
}

export function ResumeImportDialog({ profileId, onImported }: ResumeImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0] ?? null);
      setError(null);
      setSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleJsonImport = async (jsonFile: File) => {
    // JSON Resume / Reactive Resume imports are mapped client-side
    const { profile: imported } = importResumeJson(await jsonFile.text());
    await apiClient.put(`/profiles/${profileId}`, {
      ...(imported.contactInfo.email ? { contactInfo: imported.contactInfo } : {}),
      summary: imported.summary,
      skills: imported.skills,
      experience: imported.experience,
      education: imported.education,
      projects: imported.projects,
      certifications: imported.certifications,
      languages: imported.languages,
      publications: imported.publications,
      volunteer: imported.volunteer,
      references: imported.references,
      customSections: imported.customSections,
      ...(imported.layoutState ? { sectionOrder: imported.layoutState } : {}),
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        await handleJsonImport(file);
        setSuccess(true);
        onImported?.();
        return;
      }
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      await apiClient.post(`/profiles/${profileId}/import`, {
        filename: file.name,
        contentBase64,
      });

      setSuccess(true);
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          Import Resume
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Resume
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or DOCX file — or a JSON Resume / Reactive Resume export — to import your
            resume data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/20 hover:border-primary/40'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  PDF, DOCX or JSON (JSON Resume / Reactive Resume), max 10MB
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <p className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                <Check className="h-3.5 w-3.5" />
                Resume imported successfully! Your profile has been updated.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {success ? 'Close' : 'Cancel'}
            </Button>
            {!success && (
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Importing...' : 'Import'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
