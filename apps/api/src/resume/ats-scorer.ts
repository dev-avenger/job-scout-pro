import { Injectable } from '@nestjs/common';

@Injectable()
export class AtsScorer {
  score(profile: Record<string, unknown>, jobDescription?: string) {
    // Simple ATS scoring placeholder
    return {
      overallScore: 75,
      sections: {
        contactInfo: { score: 100, feedback: 'Complete' },
        experience: { score: 80, feedback: 'Good quantification' },
        skills: { score: 70, feedback: 'Add more relevant keywords' },
        education: { score: 75, feedback: 'Adequate' },
      },
      suggestions: [
        'Add more action verbs',
        'Quantify achievements where possible',
        'Include relevant keywords from job description',
      ],
    };
  }
}
