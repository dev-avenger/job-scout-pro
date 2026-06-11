import { describe, expect, it } from 'vitest';
import { detectResumeJsonFormat, importResumeJson, mapJsonResume, mapReactiveResume } from './index.js';

/* ------------------------- JSON Resume fixture ---------------------------- */

const jsonResumeFixture = {
  basics: {
    name: 'Jane Developer',
    label: 'Software Engineer',
    email: 'jane@example.com',
    phone: '+1 555 0100',
    url: 'https://jane.dev',
    summary: 'Engineer with 8 years of experience.',
    location: { city: 'Austin', region: 'TX' },
    profiles: [
      { network: 'LinkedIn', url: 'https://linkedin.com/in/jane' },
      { network: 'GitHub', url: 'https://github.com/jane' },
    ],
  },
  work: [
    {
      name: 'Acme Corp',
      position: 'Senior Engineer',
      startDate: '2020-01',
      endDate: '2023-06',
      summary: 'Led the platform team.',
      highlights: ['Cut latency by 40%', 'Mentored 4 engineers'],
    },
    { name: 'Startup Inc', position: 'Engineer', startDate: '2016-05' },
  ],
  education: [
    { institution: 'UT Austin', area: 'Computer Science', studyType: 'BSc', startDate: '2012', endDate: '2016', score: '3.8' },
  ],
  skills: [
    { name: 'TypeScript', keywords: ['React', 'Node'] },
    { name: 'PostgreSQL' },
  ],
  languages: [{ language: 'English', fluency: 'Native' }],
  projects: [{ name: 'OpenViz', description: 'Charting library', url: 'https://openviz.dev', keywords: ['d3'] }],
  certificates: [{ name: 'AWS SA', issuer: 'Amazon', date: '2022' }],
  publications: [{ name: 'On Querying', publisher: 'ACM', releaseDate: '2021' }],
  volunteer: [{ organization: 'Code Club', position: 'Mentor', summary: 'Weekly teaching' }],
  references: [{ name: 'John Boss', reference: 'Jane is great.' }],
  awards: [{ title: 'Hackathon Winner', awarder: 'TechFest', date: '2019' }],
  interests: [{ name: 'Climbing', keywords: ['bouldering'] }],
};

describe('JSON Resume import', () => {
  it('detects the format', () => {
    expect(detectResumeJsonFormat(jsonResumeFixture)).toBe('json-resume');
  });

  it('maps basics and contact info', () => {
    const p = mapJsonResume(jsonResumeFixture);
    expect(p.name).toBe('Jane Developer');
    expect(p.contactInfo.email).toBe('jane@example.com');
    expect(p.contactInfo.location).toBe('Austin, TX');
    expect(p.contactInfo.linkedin).toBe('https://linkedin.com/in/jane');
    expect(p.contactInfo.github).toBe('https://github.com/jane');
    expect(p.summary).toContain('8 years');
  });

  it('maps work to experience with bullets and current flag', () => {
    const p = mapJsonResume(jsonResumeFixture);
    expect(p.experience).toHaveLength(2);
    expect(p.experience[0]).toMatchObject({
      title: 'Senior Engineer',
      company: 'Acme Corp',
      startDate: '2020-01',
      endDate: '2023-06',
      current: false,
    });
    expect(p.experience[0]!.bullets).toEqual(['Cut latency by 40%', 'Mentored 4 engineers']);
    expect(p.experience[1]!.current).toBe(true);
  });

  it('flattens skills and keywords', () => {
    const p = mapJsonResume(jsonResumeFixture);
    expect(p.skills).toEqual(['TypeScript', 'React', 'Node', 'PostgreSQL']);
  });

  it('maps education, certifications, publications, volunteer, references', () => {
    const p = mapJsonResume(jsonResumeFixture);
    expect(p.education[0]).toMatchObject({ degree: 'BSc, Computer Science', institution: 'UT Austin', gpa: '3.8' });
    expect(p.certifications[0]).toMatchObject({ name: 'AWS SA', issuer: 'Amazon' });
    expect(p.publications[0]).toMatchObject({ title: 'On Querying', venue: 'ACM' });
    expect(p.volunteer[0]).toMatchObject({ organization: 'Code Club', role: 'Mentor' });
    expect(p.references[0]).toMatchObject({ name: 'John Boss' });
  });

  it('converts awards and interests into custom sections', () => {
    const p = mapJsonResume(jsonResumeFixture);
    const titles = p.customSections.map((c) => c.title);
    expect(titles).toContain('Awards');
    expect(titles).toContain('Interests');
    const awards = p.customSections.find((c) => c.title === 'Awards')!;
    expect(awards.items[0]!.fields.some((f) => f.value === 'Hackathon Winner')).toBe(true);
    expect(awards.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('round-trips through importResumeJson', () => {
    const { format, profile } = importResumeJson(JSON.stringify(jsonResumeFixture));
    expect(format).toBe('json-resume');
    expect(profile.name).toBe('Jane Developer');
  });
});

/* ----------------------- Reactive Resume fixture --------------------------- */

const reactiveResumeFixture = {
  basics: {
    name: 'Ali Hassan',
    email: 'ali@example.com',
    phone: '+92 300 0000000',
    location: 'Lahore, Pakistan',
    url: { href: 'https://ali.dev' },
  },
  sections: {
    summary: { id: 'summary', name: 'Summary', content: '<p>Full-stack developer.</p>' },
    skills: { id: 'skills', items: [{ name: 'React' }, { name: 'NestJS' }] },
    experience: {
      id: 'experience',
      items: [
        {
          company: 'TechCo',
          position: 'Developer',
          date: 'Jan 2021 - Present',
          location: 'Remote',
          summary: '<ul><li>Built APIs</li></ul>',
        },
      ],
    },
    education: {
      id: 'education',
      items: [{ institution: 'FAST', studyType: 'BS', area: 'CS', date: '2016 - 2020', score: '3.5' }],
    },
    languages: { id: 'languages', items: [{ name: 'Urdu', description: 'Native' }] },
    custom: {
      'abc123': {
        name: 'Achievements',
        items: [{ name: 'Top performer 2022', description: '<b>Company-wide</b> award' }],
      },
    },
  },
  metadata: {
    layout: [
      [
        ['skills', 'languages'],
        ['summary', 'experience', 'education', 'custom.abc123'],
      ],
    ],
    template: 'rhyhorn',
  },
};

describe('Reactive Resume import', () => {
  it('detects the format', () => {
    expect(detectResumeJsonFormat(reactiveResumeFixture)).toBe('reactive-resume');
  });

  it('maps basics, strips HTML from rich text', () => {
    const p = mapReactiveResume(reactiveResumeFixture);
    expect(p.name).toBe('Ali Hassan');
    expect(p.summary).toBe('Full-stack developer.');
    expect(p.contactInfo.website).toBe('https://ali.dev');
  });

  it('maps experience with split date range', () => {
    const p = mapReactiveResume(reactiveResumeFixture);
    expect(p.experience[0]).toMatchObject({
      title: 'Developer',
      company: 'TechCo',
      startDate: 'Jan 2021',
      current: true,
    });
  });

  it('maps custom sections', () => {
    const p = mapReactiveResume(reactiveResumeFixture);
    expect(p.customSections).toHaveLength(1);
    expect(p.customSections[0]!.title).toBe('Achievements');
    expect(p.customSections[0]!.items[0]!.fields[0]!.value).toBe('Top performer 2022');
  });

  it('carries the page layout over, remapping custom ids', () => {
    const p = mapReactiveResume(reactiveResumeFixture);
    expect(p.layoutState).toBeDefined();
    expect(p.layoutState!.version).toBe(2);
    expect(p.layoutState!.pages[0]![0]).toEqual(['skills', 'languages']);
    const mainColumn = p.layoutState!.pages[0]![1]!;
    expect(mainColumn.slice(0, 3)).toEqual(['summary', 'experience', 'education']);
    expect(mainColumn[3]).toBe(`custom.${p.customSections[0]!.id}`);
  });

  it('rejects unknown formats', () => {
    expect(() => importResumeJson('{"hello":"world"}')).toThrow(/Unrecognised/);
  });
});
