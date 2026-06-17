/**
 * Unit tests for the key-free scraping job sources (RemoteOK / Arbeitnow).
 * global.fetch is stubbed with realistic fixture payloads — no network access.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawJobListing, SearchCriteria } from '@auto-job-apply/shared-types';
import { RemoteOkSource } from './remoteok.source.js';
import { ArbeitnowSource } from './arbeitnow.source.js';
import { stripHtml } from './html-utils.js';

const NOW_EPOCH = Math.floor(Date.now() / 1000);

const remoteOkFixture = [
  {
    // RemoteOK's first array element is a legal notice, not a job
    legal: 'API Terms of Service: Please link back to the URL of the job post...',
    last_updated: NOW_EPOCH,
  },
  {
    id: 1091234,
    slug: 'senior-typescript-engineer-acme',
    position: 'Senior TypeScript Engineer',
    company: 'Acme Corp',
    location: 'Worldwide',
    description: '<p>We are hiring a <strong>TypeScript</strong> engineer.</p><ul><li>Node.js</li></ul>',
    url: 'https://remoteok.com/remote-jobs/1091234',
    apply_url: 'https://remoteok.com/remote-jobs/1091234',
    tags: ['typescript', 'node', 'dev'],
    salary_min: 80000,
    salary_max: 120000,
    epoch: NOW_EPOCH - 3600,
    date: new Date((NOW_EPOCH - 3600) * 1000).toISOString(),
  },
  {
    id: 1095678,
    slug: 'head-chef-foodco',
    position: 'Head Chef',
    company: 'FoodCo',
    description: '<p>Cook things.</p>',
    url: 'https://remoteok.com/remote-jobs/1095678',
    tags: ['cooking'],
    epoch: NOW_EPOCH - 7200,
  },
];

const arbeitnowFixture = {
  data: [
    {
      slug: 'typescript-developer-berlin-startup-12345',
      company_name: 'Berlin Startup GmbH',
      title: 'TypeScript Developer',
      description: '<h2>About us</h2><p>We build <em>great</em> software.</p>',
      remote: true,
      url: 'https://www.arbeitnow.com/jobs/typescript-developer-berlin-startup-12345',
      tags: ['typescript', 'react'],
      job_types: ['full-time'],
      location: 'Berlin',
      created_at: NOW_EPOCH - 3600,
    },
    {
      slug: 'accountant-munich-67890',
      company_name: 'Numbers AG',
      title: 'Accountant',
      description: '<p>Balance the books.</p>',
      remote: false,
      url: 'https://www.arbeitnow.com/jobs/accountant-munich-67890',
      tags: ['finance'],
      job_types: ['full-time'],
      location: 'Munich',
      created_at: NOW_EPOCH - 7200,
    },
  ],
};

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as unknown as Response;
}

async function collect(gen: AsyncGenerator<RawJobListing>): Promise<RawJobListing[]> {
  const out: RawJobListing[] = [];
  for await (const item of gen) out.push(item);
  return out;
}

const criteria: SearchCriteria = { keywords: ['typescript'] };

describe('stripHtml', () => {
  it('removes tags and decodes basic entities', () => {
    expect(stripHtml('<p>Hello <strong>world</strong> &amp; friends</p>')).toBe('Hello world & friends');
  });
});

describe('RemoteOkSource', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(remoteOkFixture)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips the legal-notice first element and maps fields', async () => {
    const jobs = await collect(new RemoteOkSource().search(criteria));

    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.title).toBe('Senior TypeScript Engineer');
    expect(job.companyName).toBe('Acme Corp');
    expect(job.sourceChannel).toBe('remoteok');
    expect(job.sourceUrl).toBe('https://remoteok.com/remote-jobs/1091234');
    expect(job.applyUrl).toBe('https://remoteok.com/remote-jobs/1091234');
    expect(job.externalId).toBe('1091234');
    expect(job.location).toBe('Worldwide');
    expect(job.requiredSkills).toEqual(['typescript', 'node', 'dev']);
    expect(job.salaryMin).toBe(80000);
    expect(job.postedAt).toEqual(new Date((NOW_EPOCH - 3600) * 1000));
  });

  it('strips HTML from descriptions', async () => {
    const jobs = await collect(new RemoteOkSource().search(criteria));
    expect(jobs[0]!.description).not.toMatch(/<[^>]+>/);
    expect(jobs[0]!.description).toContain('TypeScript');
    expect(jobs[0]!.description).toContain('Node.js');
  });

  it('filters out jobs that match no keyword', async () => {
    const jobs = await collect(new RemoteOkSource().search(criteria));
    expect(jobs.find((j) => j.title === 'Head Chef')).toBeUndefined();
  });

  it('defaults location to Remote when missing', async () => {
    const jobs = await collect(new RemoteOkSource().search({ keywords: ['cooking'] }));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.location).toBe('Remote');
  });

  it('respects excludeCompanies', async () => {
    const jobs = await collect(new RemoteOkSource().search({ keywords: ['typescript'], excludeCompanies: ['acme'] }));
    expect(jobs).toHaveLength(0);
  });

  it('returns no jobs (without throwing) when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const jobs = await collect(new RemoteOkSource().search(criteria));
    expect(jobs).toEqual([]);
  });

  it('returns no jobs (without throwing) on non-OK responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response));
    const jobs = await collect(new RemoteOkSource().search(criteria));
    expect(jobs).toEqual([]);
  });
});

describe('ArbeitnowSource', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(arbeitnowFixture)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps fields from the data[] payload', async () => {
    const jobs = await collect(new ArbeitnowSource().search(criteria));

    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.title).toBe('TypeScript Developer');
    expect(job.companyName).toBe('Berlin Startup GmbH');
    expect(job.sourceChannel).toBe('arbeitnow');
    expect(job.sourceUrl).toBe('https://www.arbeitnow.com/jobs/typescript-developer-berlin-startup-12345');
    expect(job.externalId).toBe('typescript-developer-berlin-startup-12345');
    expect(job.location).toBe('Berlin');
    expect(job.locationType).toBe('remote');
    expect(job.requiredSkills).toEqual(['typescript', 'react']);
    expect(job.postedAt).toEqual(new Date((NOW_EPOCH - 3600) * 1000));
  });

  it('strips HTML from descriptions', async () => {
    const jobs = await collect(new ArbeitnowSource().search(criteria));
    expect(jobs[0]!.description).not.toMatch(/<[^>]+>/);
    expect(jobs[0]!.description).toContain('About us');
    expect(jobs[0]!.description).toContain('great');
  });

  it('filters by keywords', async () => {
    const jobs = await collect(new ArbeitnowSource().search(criteria));
    expect(jobs.find((j) => j.title === 'Accountant')).toBeUndefined();
  });

  it('honors remoteOnly', async () => {
    const jobs = await collect(new ArbeitnowSource().search({ keywords: ['finance'], remoteOnly: true }));
    expect(jobs).toEqual([]);
  });

  it('returns no jobs (without throwing) when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const jobs = await collect(new ArbeitnowSource().search(criteria));
    expect(jobs).toEqual([]);
  });

  it('returns no jobs (without throwing) on non-OK responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response));
    const jobs = await collect(new ArbeitnowSource().search(criteria));
    expect(jobs).toEqual([]);
  });
});
