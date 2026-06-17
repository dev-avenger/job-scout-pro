import { describe, expect, it } from 'vitest';
import {
  normalizeText,
  levenshtein,
  similarity,
  bestOptionMatch,
  parseYearMonth,
  isConsentField,
} from './field-match.js';

describe('normalizeText', () => {
  it('lowercases, collapses whitespace and strips punctuation', () => {
    expect(normalizeText('  Senior   Engineer! ')).toBe('senior engineer');
    expect(normalizeText('C++ / C#')).toBe('c++ / c#');
  });
});

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('similarity', () => {
  it('is 1 for identical (normalized) strings', () => {
    expect(similarity('Yes', 'yes')).toBe(1);
  });
  it('is low for unrelated strings', () => {
    expect(similarity('yes', 'absolutely not')).toBeLessThan(0.5);
  });
});

describe('bestOptionMatch', () => {
  const yesNo = ['Yes', 'No'];
  it('exact-matches case-insensitively', () => {
    expect(bestOptionMatch('yes', yesNo)).toBe('Yes');
  });
  it('matches by containment', () => {
    expect(bestOptionMatch('United States of America', ['United States', 'Canada'])).toBe(
      'United States',
    );
  });
  it('fuzzy-matches near-misses', () => {
    expect(bestOptionMatch('Masters', ['Master’s Degree', 'Bachelor’s Degree'])).toBe(
      'Master’s Degree',
    );
  });
  it('returns null when nothing is close enough', () => {
    expect(bestOptionMatch('purple', yesNo)).toBeNull();
    expect(bestOptionMatch('', yesNo)).toBeNull();
    expect(bestOptionMatch('yes', [])).toBeNull();
  });
});

describe('parseYearMonth', () => {
  it('parses ISO-ish values', () => {
    expect(parseYearMonth('2021-3')).toBe('2021-03');
    expect(parseYearMonth('2021/03')).toBe('2021-03');
  });
  it('parses MM/YYYY', () => {
    expect(parseYearMonth('03/2021')).toBe('2021-03');
  });
  it('parses month names', () => {
    expect(parseYearMonth('Mar 2021')).toBe('2021-03');
    expect(parseYearMonth('January 2020')).toBe('2020-01');
  });
  it('parses bare years', () => {
    expect(parseYearMonth('2019')).toBe('2019');
  });
  it('returns null for open-ended or empty', () => {
    expect(parseYearMonth('Present')).toBeNull();
    expect(parseYearMonth('current')).toBeNull();
    expect(parseYearMonth('')).toBeNull();
    expect(parseYearMonth('nonsense')).toBeNull();
  });
});

describe('isConsentField', () => {
  it('detects agreement/consent gates', () => {
    expect(isConsentField('I agree to the terms and conditions')).toBe(true);
    expect(isConsentField('I consent to data processing')).toBe(true);
    expect(isConsentField('Accept the Privacy Policy')).toBe(true);
    expect(isConsentField('Opt-in to marketing emails')).toBe(true);
  });
  it('ignores ordinary questions', () => {
    expect(isConsentField('Years of experience')).toBe(false);
    expect(isConsentField('What is your expected salary?')).toBe(false);
    expect(isConsentField('')).toBe(false);
  });
});
