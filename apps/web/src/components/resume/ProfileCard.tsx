import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import type { Profile } from '../../types/resume';

export interface ProfileCardProps {
  profile: Profile;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export function ProfileCard({
  profile,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  deleting,
}: ProfileCardProps) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-md'
          : 'hover:border-muted-foreground/20',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{profile.name}</h3>
              {profile.isDefault && (
                <Badge variant="warning" className="gap-1 shrink-0">
                  <Star className="h-3 w-3" />
                  Default
                </Badge>
              )}
            </div>
            {profile.contactInfo?.email && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {profile.contactInfo.email}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground/60">
              Created {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
