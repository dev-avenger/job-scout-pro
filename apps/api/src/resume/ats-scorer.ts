import { Injectable } from '@nestjs/common';

interface AtsSectionScore {
  score: number;
  feedback: string;
}

export interface AtsScoreResult {
  overallScore: number;
  sections: Record<string, AtsSectionScore>;
  suggestions: string[];
  keywordMatches: string[];
  missingKeywords: string[];
}

@Injectable()
export class AtsScorer {
  private readonly actionVerbs = [
    'achieved', 'managed', 'developed', 'led', 'created', 'implemented',
    'designed', 'improved', 'reduced', 'increased', 'built', 'launched',
    'optimized', 'delivered', 'established', 'generated', 'streamlined',
    'coordinated', 'analyzed', 'resolved', 'mentored', 'negotiated',
  ];

  score(profile: Record<string, unknown>, jobDescription?: string): AtsScoreResult {
    const sections: Record<string, AtsSectionScore> = {};
    const suggestions: string[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Contact Info completeness (weight: 10)
    const contactInfo = profile.contactInfo as Record<string, unknown> | undefined;
    const contactFields = ['name', 'email', 'phone', 'linkedin'];
    const contactPresent = contactFields.filter(f => contactInfo?.[f]).length;
    sections.contactInfo = {
      score: Math.round((contactPresent / contactFields.length) * 100),
      feedback: contactPresent >= 3 ? 'Contact info is complete' : 'Add missing contact details',
    };
    if (contactPresent < 3) suggestions.push('Add phone number and LinkedIn URL to contact info');
    totalWeight += 10;
    weightedScore += (sections.contactInfo.score / 100) * 10;

    // Summary section (weight: 15)
    const summary = profile.summary as string || '';
    const summaryScore = summary.length > 50 ? (summary.length > 200 ? 100 : 70) : (summary.length > 0 ? 40 : 0);
    sections.summary = {
      score: summaryScore,
      feedback: summaryScore >= 70 ? 'Good professional summary' : 'Add a professional summary (2-3 sentences)',
    };
    if (summaryScore < 70) suggestions.push('Write a professional summary highlighting your key strengths');
    totalWeight += 15;
    weightedScore += (summaryScore / 100) * 15;

    // Experience section (weight: 30)
    const experience = profile.experience as Array<Record<string, unknown>> || [];
    let expScore = 0;
    if (experience.length === 0) {
      expScore = 0;
      suggestions.push('Add work experience entries');
    } else {
      let bulletCount = 0;
      let actionVerbCount = 0;
      let quantifiedCount = 0;
      for (const exp of experience) {
        const bullets = (exp.bullets as string[]) || [];
        bulletCount += bullets.length;
        for (const bullet of bullets) {
          const lower = bullet.toLowerCase();
          if (this.actionVerbs.some(v => lower.startsWith(v))) actionVerbCount++;
          if (/\d+%|\$\d+|\d+ (million|billion|users|clients|projects|team)/i.test(bullet)) quantifiedCount++;
        }
      }
      const avgBullets = bulletCount / experience.length;
      const actionRatio = bulletCount > 0 ? actionVerbCount / bulletCount : 0;
      const quantifyRatio = bulletCount > 0 ? quantifiedCount / bulletCount : 0;

      expScore = Math.min(100, Math.round(
        (avgBullets >= 3 ? 30 : avgBullets * 10) +
        (actionRatio * 40) +
        (quantifyRatio * 30),
      ));

      if (actionRatio < 0.5) suggestions.push('Start more bullet points with strong action verbs');
      if (quantifyRatio < 0.3) suggestions.push('Quantify achievements where possible (%, $, numbers)');
      if (avgBullets < 3) suggestions.push('Add at least 3 bullet points per experience entry');
    }
    sections.experience = {
      score: expScore,
      feedback: expScore >= 70 ? 'Good experience section with quantified achievements' : 'Strengthen experience with action verbs and metrics',
    };
    totalWeight += 30;
    weightedScore += (expScore / 100) * 30;

    // Skills section (weight: 20)
    const skills = profile.skills as Array<Record<string, unknown>> || [];
    const skillScore = skills.length >= 8 ? 100 : skills.length >= 5 ? 80 : skills.length >= 2 ? 50 : 0;
    sections.skills = {
      score: skillScore,
      feedback: skillScore >= 80 ? 'Good skills section' : 'Add more relevant skills',
    };
    if (skillScore < 80) suggestions.push('Include at least 8 relevant skills');
    totalWeight += 20;
    weightedScore += (skillScore / 100) * 20;

    // Education section (weight: 10)
    const education = profile.education as Array<Record<string, unknown>> || [];
    const eduScore = education.length > 0 ? 100 : 0;
    sections.education = {
      score: eduScore,
      feedback: eduScore > 0 ? 'Education section present' : 'Add education details',
    };
    if (eduScore === 0) suggestions.push('Add your education history');
    totalWeight += 10;
    weightedScore += (eduScore / 100) * 10;

    // Keyword matching against job description (weight: 15)
    const keywordMatches: string[] = [];
    const missingKeywords: string[] = [];
    if (jobDescription) {
      const jobWords = jobDescription.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      const wordFreq = new Map<string, number>();
      for (const w of jobWords) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);

      const topKeywords = [...wordFreq.entries()]
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word);

      const profileText = JSON.stringify(profile).toLowerCase();
      for (const kw of topKeywords) {
        if (profileText.includes(kw)) keywordMatches.push(kw);
        else missingKeywords.push(kw);
      }

      const kwScore = topKeywords.length > 0
        ? Math.round((keywordMatches.length / topKeywords.length) * 100)
        : 50;
      sections.keywords = { score: kwScore, feedback: `${keywordMatches.length}/${topKeywords.length} job keywords found` };
      if (missingKeywords.length > 0) {
        suggestions.push(`Consider adding these keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
      }
      totalWeight += 15;
      weightedScore += (kwScore / 100) * 15;
    }

    const overallScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 75;

    return { overallScore, sections, suggestions, keywordMatches, missingKeywords };
  }
}
