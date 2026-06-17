import { describe, expect, it } from 'vitest';
import { FormMemory, fieldKey } from './form-memory.js';

describe('fieldKey', () => {
  it('normalizes key/label', () => {
    expect(fieldKey({ key: 'First Name', label: 'x' })).toBe('first name');
    expect(fieldKey({ key: '', label: '  Why  this   role? ' })).toBe('why this role?');
  });
});

describe('FormMemory', () => {
  it('returns only fields not seen on a previous step', () => {
    const m = new FormMemory();
    const step1 = m.recordStep([
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
    ]);
    expect(step1.map((f) => f.key)).toEqual(['name', 'email']);

    // Step 2 re-shows name/email and reveals a conditional field.
    const step2 = m.recordStep([
      { key: 'name', label: 'Name' },
      { key: 'mgmt', label: 'Describe your management style' },
    ]);
    expect(step2.map((f) => f.key)).toEqual(['mgmt']);
    expect(m.stepCount).toBe(2);
  });

  it('dedupes by normalized key and ignores empty', () => {
    const m = new FormMemory();
    m.recordStep([{ key: 'First Name', label: 'x' }]);
    const again = m.recordStep([
      { key: 'first name', label: 'x' },
      { key: '', label: '' },
    ]);
    expect(again).toEqual([]);
  });

  it('accumulates answers across steps', () => {
    const m = new FormMemory();
    const f1 = { key: 'name', label: 'Name' };
    const f2 = { key: 'mgmt', label: 'Management style' };
    m.recordStep([f1]);
    m.setAnswer(f1, 'Jane');
    m.recordStep([f2]);
    m.setAnswer(f2, 'Servant leadership');

    expect(m.getAnswer(f1)).toBe('Jane');
    expect(m.answeredCount).toBe(2);
    expect(m.snapshot()).toEqual({ name: 'Jane', mgmt: 'Servant leadership' });
  });
});
