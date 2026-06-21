import { describe, expect, it } from 'vitest';
import { AtsApplyService } from './ats-apply.service.js';

// detectAts is pure (no deps used), so a bare instance is fine.
const svc = new AtsApplyService({} as never);

describe('AtsApplyService.detectAts', () => {
  it('detects Greenhouse with board + jobId', () => {
    expect(svc.detectAts('https://boards.greenhouse.io/acme/jobs/12345')).toEqual({
      type: 'greenhouse',
      ref: { board: 'acme', jobId: '12345' },
    });
  });

  it('detects Workable shortcode', () => {
    const r = svc.detectAts('https://apply.workable.com/acme/j/ABCDEF1234/apply');
    expect(r.type).toBe('workable');
    expect(r.ref).toMatchObject({ company: 'acme', shortcode: 'ABCDEF1234' });
  });

  it('detects Lever', () => {
    expect(svc.detectAts('https://jobs.lever.co/acme/uuid-1').type).toBe('lever');
  });

  it('detects SmartRecruiters', () => {
    const r = svc.detectAts('https://jobs.smartrecruiters.com/AcmeInc/74399912-engineer');
    expect(r.type).toBe('smartrecruiters');
    expect(r.ref).toMatchObject({ company: 'AcmeInc' });
  });

  it('detects BambooHR with company + jobId', () => {
    const r = svc.detectAts('https://acme.bamboohr.com/careers/123');
    expect(r.type).toBe('bamboohr');
    expect(r.ref).toMatchObject({ company: 'acme', jobId: '123' });
  });

  it('detects Workday', () => {
    expect(svc.detectAts('https://acme.wd1.myworkdayjobs.com/en-US/careers/job/123').type).toBe(
      'workday',
    );
  });

  it('detects SuccessFactors', () => {
    expect(svc.detectAts('https://career5.successfactors.eu/career?company=acme').type).toBe(
      'successfactors',
    );
  });

  it('falls back to unknown for arbitrary sites', () => {
    expect(svc.detectAts('https://careers.example.com/apply/9').type).toBe('unknown');
    expect(svc.detectAts('not a url').type).toBe('unknown');
  });
});
