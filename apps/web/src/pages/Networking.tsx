import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Users, Plus, Mail, Link2 as Linkedin } from 'lucide-react';
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
    apiClient.get<Contact[]>('/outreach/contacts').then(setContacts).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Networking & CRM</h1>
          <p className="text-muted-foreground mt-1">Manage your professional contacts and outreach</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
      </div>

      {contacts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground mb-2">No contacts yet</h3>
          <p className="text-sm">Add recruiters, hiring managers, and referrals to track your networking efforts.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {contact.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{contact.name}</span>
                  {contact.relationshipType && <Badge variant="secondary">{contact.relationshipType}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{[contact.title, contact.company].filter(Boolean).join(' at ')}</p>
              </div>
              <div className="flex gap-2">
                {contact.email && <Button variant="ghost" size="sm"><Mail className="w-4 h-4" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
