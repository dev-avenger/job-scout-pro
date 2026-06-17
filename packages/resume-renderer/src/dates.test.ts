import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, formatComposedRange } from './dates.js';

describe('formatDate', () => {
  it('reformats parseable dates to the target format', () => {
    expect(formatDate('2021-03', 'MM/YYYY')).toBe('03/2021');
    expect(formatDate('Mar 2021', 'MM.YYYY')).toBe('03.2021');
    expect(formatDate('03/2021', 'DD/MM/YYYY')).toBe('03/2021');
    expect(formatDate('January 2020', 'MM/YYYY')).toBe('01/2020');
  });
  it('keeps bare years as years', () => {
    expect(formatDate('2019', 'MM/YYYY')).toBe('2019');
  });
  it('normalizes open-ended values to Present', () => {
    expect(formatDate('current', 'MM/YYYY')).toBe('Present');
    expect(formatDate('Present', 'MM.YYYY')).toBe('Present');
  });
  it('passes through unparseable or unformatted values', () => {
    expect(formatDate('Summer 2021', 'MM/YYYY')).toBe('Summer 2021');
    expect(formatDate('2021-03', undefined)).toBe('2021-03');
    expect(formatDate('', 'MM/YYYY')).toBe('');
  });
});

describe('formatDateRange', () => {
  it('formats both ends', () => {
    expect(formatDateRange('2019-01', '2021-06', false, 'MM/YYYY')).toBe('01/2019 - 06/2021');
  });
  it('handles current/open-ended', () => {
    expect(formatDateRange('2019-01', undefined, true, 'MM/YYYY')).toBe('01/2019 - Present');
    expect(formatDateRange('2019-01', undefined, false, 'MM/YYYY')).toBe('01/2019 - Present');
  });
  it('returns empty when nothing is set', () => {
    expect(formatDateRange(undefined, undefined, false, 'MM/YYYY')).toBe('');
  });
});

describe('formatComposedRange', () => {
  it('reformats a pre-composed "a - b" string', () => {
    expect(formatComposedRange('2018 - 2020', 'MM/YYYY')).toBe('2018 - 2020');
    expect(formatComposedRange('2018-09 - 2020-05', 'MM/YYYY')).toBe('09/2018 - 05/2020');
  });
  it('reformats a single composed value', () => {
    expect(formatComposedRange('2018-09', 'MM.YYYY')).toBe('09.2018');
  });
  it('passes through without a format', () => {
    expect(formatComposedRange('2018 - 2020', undefined)).toBe('2018 - 2020');
  });
});
