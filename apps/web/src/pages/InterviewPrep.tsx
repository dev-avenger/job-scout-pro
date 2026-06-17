import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { UserCheck, Brain, MessageSquare, Lightbulb, ArrowRight } from 'lucide-react';

const UPCOMING_FEATURES = [
  {
    icon: Brain,
    title: 'Likely Questions',
    description: 'Role-specific questions predicted from the job description.',
    chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    icon: MessageSquare,
    title: 'Talking Points',
    description: 'Tailored stories that map your experience to the role.',
    chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Lightbulb,
    title: 'Company Insights',
    description: 'Culture, products, and news to reference in conversation.',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export function InterviewPrep() {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Interview Preparation"
        description="AI-generated prep materials for your upcoming interviews"
      />

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <UserCheck className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-5 text-base font-semibold text-foreground">No upcoming interviews</h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          When you receive an interview invitation, prep materials will be generated
          automatically. You can also generate prep for any application manually.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => navigate('/applications')}>
          Go to Applications
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* What to expect */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING_FEATURES.map((feature) => (
          <Card key={feature.title} className="border-border/60 shadow-soft">
            <CardContent className="p-5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.chip}`}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
