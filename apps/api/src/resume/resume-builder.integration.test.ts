/**
 * API round-trip tests for the resume page builder.
 * Real Nest controllers, real Zod validation pipes, real PDF/DOCX generators —
 * only the database layer is mocked. Requests go through Fastify's
 * light-my-request (app.inject), i.e. the full HTTP pipeline.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { ExecutionContext } from '@nestjs/common';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { BUILTIN_TEMPLATES, defaultPagesLayout } from '@auto-job-apply/shared-types';

import { ResumeController } from './resume.controller.js';
import { RESUME_SERVICE } from './resume.constants.js';
import { PdfGenerator } from './export/pdf-generator.js';
import { HtmlPdfGenerator } from './export/html-pdf-generator.js';
import { DocxGenerator } from './export/docx-generator.js';
import { ResumeTailorAgent } from './agents/resume-tailor.agent.js';
import { CoverLetterAgent } from './agents/cover-letter.agent.js';
import { AtsScorer } from './ats-scorer.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TemplatesController } from '../templates/templates.controller.js';
import { TemplatesRepository } from '../templates/templates.repository.js';

const USER = { sub: 'user-1', email: 'faisalnadeem0803@gmail.com' };

const profileFixture: Record<string, unknown> = {
  id: 'p1',
  userId: USER.sub,
  name: 'Faisal Nadeem',
  contactInfo: { email: 'faisalnadeem0803@gmail.com', phone: '+92 300 1234567' },
  summary: 'Full-stack engineer.',
  skills: ['React', 'NestJS'],
  experience: [{ title: 'Senior Dev', company: 'TechCo', startDate: '2021', description: 'Built things.' }],
  education: [],
  customSections: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Awards',
      type: 'list',
      items: [{ id: 'a1', fields: [{ label: '', value: 'Best Engineer 2023' }] }],
    },
  ],
  sectionOrder: { version: 2, pages: defaultPagesLayout(false), hiddenSections: [] },
};

const resumeService = {
  getProfile: vi.fn(async (..._args: unknown[]): Promise<Record<string, unknown>> => profileFixture),
  updateProfile: vi.fn(async (..._args: unknown[]): Promise<void> => undefined),
  listProfiles: vi.fn(async (..._args: unknown[]) => [profileFixture]),
};

const userTemplate = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: USER.sub,
  slug: 'my-template',
  name: 'My Template',
  region: 'general',
  config: BUILTIN_TEMPLATES[0]!.config,
  isBuiltIn: false,
  version: 1,
};

const templatesRepo = {
  list: vi.fn(async () => [userTemplate]),
  get: vi.fn(async (_u: string, id: string) => (id === userTemplate.id ? userTemplate : null)),
  create: vi.fn(async () => ({ id: 'new-template-id' })),
  update: vi.fn(async () => undefined),
  delete: vi.fn(async () => undefined),
};

let app: NestFastifyApplication;

beforeAll(async () => {
  process.env.PDF_ENGINE = 'pdfkit'; // no Chromium in CI — exercise the fallback engine

  const moduleRef = await Test.createTestingModule({
    controllers: [ResumeController, TemplatesController],
    providers: [
      { provide: RESUME_SERVICE, useValue: resumeService },
      { provide: TemplatesRepository, useValue: templatesRepo },
      PdfGenerator,
      HtmlPdfGenerator,
      DocxGenerator,
      { provide: ResumeTailorAgent, useValue: {} },
      { provide: CoverLetterAgent, useValue: {} },
      { provide: AtsScorer, useValue: {} },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (ctx: ExecutionContext) => {
        ctx.switchToHttp().getRequest().user = USER;
        return true;
      },
    })
    .compile();

  app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ bodyLimit: 16 * 1024 * 1024 }),
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app?.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PUT /api/v1/profiles/:id — builder autosave payloads', () => {
  it('accepts a v2 layout object and custom sections', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/profiles/p1',
      payload: {
        sectionOrder: { version: 2, pages: [[['summary', 'experience']]], hiddenSections: ['skills'] },
        customSections: profileFixture.customSections,
      },
    });
    expect(res.statusCode).toBe(204); // PUT /profiles/:id responds 204 No Content
    expect(resumeService.updateProfile).toHaveBeenCalledWith(
      USER.sub,
      'p1',
      expect.objectContaining({
        sectionOrder: expect.objectContaining({ version: 2 }),
        customSections: expect.any(Array),
      }),
    );
  });

  it('accepts a v3 row-based layout object', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/profiles/p1',
      payload: {
        sectionOrder: {
          version: 3,
          pages: [[{ cells: [{ widthPercent: 33, tinted: true, sections: ['skills'] }, { sections: ['summary'] }] }]],
          hiddenSections: [],
        },
      },
    });
    expect(res.statusCode).toBe(204);
    expect(resumeService.updateProfile).toHaveBeenCalledWith(
      USER.sub,
      'p1',
      expect.objectContaining({ sectionOrder: expect.objectContaining({ version: 3 }) }),
    );
  });

  it('still accepts legacy v1 arrays', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/profiles/p1',
      payload: { sectionOrder: [{ id: 'summary', label: 'Summary', visible: true }] },
    });
    expect(res.statusCode).toBe(204);
  });

  it('rejects malformed payloads with 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/profiles/p1',
      payload: { sectionOrder: 'not-a-layout' },
    });
    expect(res.statusCode).toBe(400);
    expect(resumeService.updateProfile).not.toHaveBeenCalled();
  });
});

describe('templates registry API', () => {
  it('GET /templates returns built-ins plus user templates', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/templates' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ slug: string; isBuiltIn: boolean }>;
    const slugs = body.map((t) => t.slug);
    expect(slugs).toContain('europass');
    expect(slugs).toContain('usa-resume');
    expect(slugs).toContain('pakistan-cv');
    expect(slugs).toContain('my-template');
    expect(body.filter((t) => t.isBuiltIn)).toHaveLength(BUILTIN_TEMPLATES.length);
  });

  it('POST /templates validates config with zod and saves', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates',
      payload: { name: 'Saved From Builder', region: 'general', config: BUILTIN_TEMPLATES[1]!.config },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: 'new-template-id' });
    expect(templatesRepo.create).toHaveBeenCalledWith(
      USER.sub,
      expect.objectContaining({ slug: 'saved-from-builder' }),
    );
  });

  it('POST /templates rejects an invalid config', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates',
      payload: { name: 'Bad', config: { layout: 'nope' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE removes user templates and refuses unknown ids', async () => {
    const ok = await app.inject({ method: 'DELETE', url: `/api/v1/templates/${userTemplate.id}` });
    expect(ok.statusCode).toBe(204);
    const missing = await app.inject({ method: 'DELETE', url: '/api/v1/templates/nope' });
    expect(missing.statusCode).toBe(404);
  });
});

describe('PDF export round-trip', () => {
  it('GET export/pdf returns a valid PDF containing custom sections', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/profiles/p1/export/pdf' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    expect(res.rawPayload.length).toBeGreaterThan(800);
  });

  it('POST export/pdf (WYSIWYG payload from the builder, v3 layout) returns a PDF', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/p1/export/pdf',
      payload: {
        config: BUILTIN_TEMPLATES.find((t) => t.slug === 'usa-resume')!.config,
        layoutState: {
          version: 3,
          pages: [
            [
              { cells: [{ sections: ['summary'] }] },
              {
                cells: [
                  { widthPercent: 33, tinted: true, sections: ['skills'] },
                  { sections: ['experience', 'education'] },
                ],
              },
            ],
          ],
          hiddenSections: [],
        },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('POST export/pdf still accepts legacy v2 layout payloads (backward compat)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/p1/export/pdf',
      payload: {
        config: BUILTIN_TEMPLATES.find((t) => t.slug === 'usa-resume')!.config,
        layoutState: { version: 2, pages: defaultPagesLayout(false), hiddenSections: [] },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('POST export/pdf rejects an invalid layout state', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/p1/export/pdf',
      payload: { config: BUILTIN_TEMPLATES[0]!.config, layoutState: { version: 99 } },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/v1/profiles/:id/import — server-side resume import', () => {
  it('imports a DOCX file and extracts contact info and skills', async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun('Jane Applicant')] }),
            new Paragraph({ children: [new TextRun('jane.applicant@example.com | +1 555 010 9999')] }),
            new Paragraph({ children: [new TextRun('Summary')] }),
            new Paragraph({ children: [new TextRun('Seasoned platform engineer.')] }),
            new Paragraph({ children: [new TextRun('Skills')] }),
            new Paragraph({ children: [new TextRun('TypeScript, PostgreSQL, Docker')] }),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);

    // import into a profile with no existing contact email/skills
    resumeService.getProfile.mockResolvedValueOnce({ ...profileFixture, contactInfo: {}, skills: [], summary: undefined });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/p1/import',
      payload: { filename: 'jane.docx', contentBase64: Buffer.from(buffer).toString('base64') },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { imported: boolean; extracted: { contactInfo: { email?: string }; skills: number } };
    expect(body.imported).toBe(true);
    expect(body.extracted.contactInfo.email).toBe('jane.applicant@example.com');
    expect(body.extracted.skills).toBeGreaterThanOrEqual(3);

    const update = resumeService.updateProfile.mock.calls[0]![2] as Record<string, any>;
    expect(update.rawImport.filename).toBe('jane.docx');
    expect(update.skills).toContain('TypeScript');
    expect(update.summary).toContain('platform engineer');
  });

  it('rejects unsupported file types', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/profiles/p1/import',
      payload: { filename: 'resume.txt', contentBase64: Buffer.from('hello').toString('base64') },
    });
    expect(res.statusCode).toBe(400);
  });
});
