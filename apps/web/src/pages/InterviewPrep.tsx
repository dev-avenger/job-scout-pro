import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { UserCheck, Brain, MessageSquare, Lightbulb } from 'lucide-react';

export function InterviewPrep() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview Preparation</h1>
        <p className="text-muted-foreground mt-1">AI-generated prep materials for your upcoming interviews</p>
      </div>

      <Card className="p-8 text-center text-muted-foreground">
        <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <h3 className="font-semibold text-foreground mb-2">No Upcoming Interviews</h3>
        <p className="text-sm">When you receive an interview invitation, prep materials will be generated automatically.</p>
        <p className="text-sm mt-2">You can also manually generate prep for any application from the Applications page.</p>
      </Card>
    </div>
  );
}
