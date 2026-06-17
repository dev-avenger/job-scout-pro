import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { Users, Plus, Mail } from 'lucide-react';
import { apiClient } from '../api/client';

interface Contact {
  id: string;
  name: string;
  email?: string;
  title?: string;
  company?: string;
  relationshipType?: string;
  tags: string[];
}

export function Networking() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    apiClient.get<Contact[]>('/contacts').then(setContacts).catch(() => {});
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Networking & CRM"
        description="Manage your professional contacts and outreach"
        actions={
          <Button className="shadow-soft">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        }
      />

      {contacts.length === 0 ? (
        <Card className="border-border/60 shadow-soft">
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Add recruiters, hiring managers, and referrals to track your
              networking efforts.
            </p>
            <Button variant="outline" className="mt-5">
              <Plus className="w-4 h-4 mr-2" />
              Add your first contact
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="p-4 flex items-center gap-4 border-border/60 shadow-soft card-hover"
            >
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                {contact.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {contact.name}
                  </span>
                  {contact.relationshipType && (
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {contact.relationshipType}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[contact.title, contact.company].filter(Boolean).join(' at ')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {contact.email && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Mail className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
