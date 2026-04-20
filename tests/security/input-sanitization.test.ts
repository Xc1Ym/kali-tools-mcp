import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../../src/utils/security.js';
import { isSafeArgument } from '../../src/validators/safety.js';

describe('Input Sanitization Security Tests', () => {
  describe('Edge cases in sanitizeInput', () => {
    it('accepts empty string', () => {
      expect(sanitizeInput('')).toBe(true);
    });

    it('accepts very long safe string', () => {
      expect(sanitizeInput('a'.repeat(10000))).toBe(true);
    });

    it('blocks string with only ..', () => {
      expect(sanitizeInput('..')).toBe(false);
    });

    it('blocks path with .. in middle', () => {
      expect(sanitizeInput('foo/../bar')).toBe(false);
    });
  });

  describe('Edge cases in isSafeArgument', () => {
    it('accepts clean arguments', () => {
      expect(isSafeArgument('normal-arg')).toBe(true);
      expect(isSafeArgument('--flag')).toBe(true);
      expect(isSafeArgument('value=123')).toBe(true);
    });

    it('blocks double slashes (potential bypass)', () => {
      expect(isSafeArgument('path//traversal')).toBe(false);
    });

    it('blocks variable expansion', () => {
      expect(isSafeArgument('${IFS}')).toBe(false);
      expect(isSafeArgument('${PATH}')).toBe(false);
    });

    it('blocks all shell metacharacter combinations', () => {
      const metacharTests = [
        'a;b', 'a|b', 'a`b', 'a$(b)', 'a&b',
      ];
      for (const test of metacharTests) {
        expect(isSafeArgument(test)).toBe(false);
      }
    });
  });
});
