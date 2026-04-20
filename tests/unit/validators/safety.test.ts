import { describe, it, expect, beforeEach } from 'vitest';
import {
  SafetyLevel,
  assessScanRisk,
  isSafeArgument,
  sanitizeArguments,
  isSafePath,
  isReasonableOutputSize,
  isValidTiming,
  isValidIntensity,
  RateLimiter,
} from '../../../src/validators/safety.js';

describe('assessScanRisk', () => {
  it('returns SAFE for default options', () => {
    const result = assessScanRisk({
      targets: ['192.168.1.1'],
      aggressiveScan: false,
      exploitAttempts: false,
      bruteForce: false,
    });
    expect(result.level).toBe(SafetyLevel.SAFE);
    expect(result.allowed).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('returns PROHIBITED for exploit attempts', () => {
    const result = assessScanRisk({
      targets: ['192.168.1.1'],
      aggressiveScan: false,
      exploitAttempts: true,
      bruteForce: false,
    });
    expect(result.level).toBe(SafetyLevel.PROHIBITED);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('Exploitation attempts are not allowed');
    expect(result.requiresConfirmation).toBe(false);
  });

  it('returns DANGEROUS for brute force', () => {
    const result = assessScanRisk({
      targets: ['192.168.1.1'],
      aggressiveScan: false,
      exploitAttempts: false,
      bruteForce: true,
    });
    expect(result.level).toBe(SafetyLevel.DANGEROUS);
    expect(result.allowed).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
  });

  it('returns CAUTION for aggressive scan', () => {
    const result = assessScanRisk({
      targets: ['192.168.1.1'],
      aggressiveScan: true,
      exploitAttempts: false,
      bruteForce: false,
    });
    expect(result.level).toBe(SafetyLevel.CAUTION);
    expect(result.requiresConfirmation).toBe(true);
  });

  it('returns CAUTION for many targets (>10)', () => {
    const targets = Array.from({ length: 15 }, (_, i) => `10.0.${i}.1`);
    const result = assessScanRisk({
      targets,
      aggressiveScan: false,
      exploitAttempts: false,
      bruteForce: false,
    });
    expect(result.level).toBe(SafetyLevel.CAUTION);
    expect(result.reasons).toContain('Scanning multiple targets may generate significant network traffic');
  });

  it('bruteForce dominates aggressiveScan', () => {
    const result = assessScanRisk({
      targets: ['192.168.1.1'],
      aggressiveScan: true,
      exploitAttempts: false,
      bruteForce: true,
    });
    expect(result.level).toBe(SafetyLevel.DANGEROUS);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('exploit attempts return early before checking other flags', () => {
    const result = assessScanRisk({
      targets: ['192.168.1.1'],
      aggressiveScan: true,
      exploitAttempts: true,
      bruteForce: true,
    });
    expect(result.level).toBe(SafetyLevel.PROHIBITED);
    expect(result.reasons).toHaveLength(1);
  });
});

describe('isSafeArgument', () => {
  it('accepts safe arguments', () => {
    expect(isSafeArgument('normal-arg')).toBe(true);
    expect(isSafeArgument('192.168.1.1')).toBe(true);
    expect(isSafeArgument('file.txt')).toBe(true);
    expect(isSafeArgument('--option=value')).toBe(true);
    expect(isSafeArgument('-sS')).toBe(true);
    expect(isSafeArgument('80')).toBe(true);
  });

  it('blocks shell metacharacters', () => {
    expect(isSafeArgument('arg;rm -rf /')).toBe(false);
    expect(isSafeArgument('arg|cat')).toBe(false);
    expect(isSafeArgument('arg`cmd`')).toBe(false);
    expect(isSafeArgument('$(cmd)')).toBe(false);
    expect(isSafeArgument('arg&cmd')).toBe(false);
  });

  it('blocks path traversal', () => {
    expect(isSafeArgument('../../../etc/passwd')).toBe(false);
    expect(isSafeArgument('..\\..\\windows')).toBe(false);
  });

  it('blocks double slashes', () => {
    expect(isSafeArgument('path//to//file')).toBe(false);
  });

  it('blocks variable expansion', () => {
    expect(isSafeArgument('${IFS}')).toBe(false);
    expect(isSafeArgument('${PATH}')).toBe(false);
  });
});

describe('sanitizeArguments', () => {
  it('filters unsafe arguments', () => {
    const result = sanitizeArguments(['-sS', '-p', '80;rm -rf /', '192.168.1.1']);
    expect(result).toEqual(['-sS', '-p', '192.168.1.1']);
  });

  it('returns all safe arguments', () => {
    const result = sanitizeArguments(['-sS', '-p', '80', '192.168.1.1']);
    expect(result).toEqual(['-sS', '-p', '80', '192.168.1.1']);
  });

  it('returns empty for empty array', () => {
    expect(sanitizeArguments([])).toEqual([]);
  });

  it('filters all dangerous args', () => {
    const result = sanitizeArguments([';cmd', '|pipe', '`backtick`']);
    expect(result).toEqual([]);
  });
});

describe('isSafePath', () => {
  it('accepts safe relative paths', () => {
    expect(isSafePath('relative/path')).toBe(true);
    expect(isSafePath('file.txt')).toBe(true);
    expect(isSafePath('dir/subdir')).toBe(true);
  });

  it('blocks absolute paths', () => {
    expect(isSafePath('/etc/passwd')).toBe(false);
    expect(isSafePath('/tmp/output')).toBe(false);
  });

  it('blocks path traversal', () => {
    expect(isSafePath('../../etc/passwd')).toBe(false);
    expect(isSafePath('foo/../../bar')).toBe(false);
  });

  it('blocks home directory', () => {
    expect(isSafePath('~/secret')).toBe(false);
  });
});

describe('isReasonableOutputSize', () => {
  it('accepts sizes within default 10MB limit', () => {
    expect(isReasonableOutputSize(0)).toBe(true);
    expect(isReasonableOutputSize(1024)).toBe(true);
    expect(isReasonableOutputSize(10 * 1024 * 1024)).toBe(true);
  });

  it('rejects sizes over default limit', () => {
    expect(isReasonableOutputSize(10 * 1024 * 1024 + 1)).toBe(false);
  });

  it('respects custom max size', () => {
    expect(isReasonableOutputSize(1000, 500)).toBe(false);
    expect(isReasonableOutputSize(500, 1000)).toBe(true);
  });
});

describe('isValidTiming', () => {
  it('accepts valid timing levels 0-5', () => {
    for (let i = 0; i <= 5; i++) {
      expect(isValidTiming(i)).toBe(true);
    }
  });

  it('rejects invalid timing', () => {
    expect(isValidTiming(-1)).toBe(false);
    expect(isValidTiming(6)).toBe(false);
    expect(isValidTiming(NaN)).toBe(false);
  });
});

describe('isValidIntensity', () => {
  it('accepts valid intensities (case insensitive)', () => {
    expect(isValidIntensity('normal')).toBe(true);
    expect(isValidIntensity('hard')).toBe(true);
    expect(isValidIntensity('insane')).toBe(true);
    expect(isValidIntensity('paranoid')).toBe(true);
    expect(isValidIntensity('Normal')).toBe(true);
    expect(isValidIntensity('HARD')).toBe(true);
  });

  it('rejects invalid intensities', () => {
    expect(isValidIntensity('fast')).toBe(false);
    expect(isValidIntensity('slow')).toBe(false);
    expect(isValidIntensity('')).toBe(false);
    expect(isValidIntensity('unknown')).toBe(false);
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(60000, 3);
  });

  it('allows operations within limit', () => {
    expect(limiter.canPerformOperation('test')).toBe(true);
    expect(limiter.canPerformOperation('test')).toBe(true);
    expect(limiter.canPerformOperation('test')).toBe(true);
  });

  it('blocks operations exceeding limit', () => {
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    expect(limiter.canPerformOperation('test')).toBe(false);
  });

  it('resets specific identifier', () => {
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    limiter.reset('test');
    expect(limiter.canPerformOperation('test')).toBe(true);
  });

  it('resets all identifiers', () => {
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('b');
    limiter.reset();
    expect(limiter.canPerformOperation('a')).toBe(true);
    expect(limiter.canPerformOperation('b')).toBe(true);
  });

  it('tracks identifiers independently', () => {
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('a');
    expect(limiter.canPerformOperation('a')).toBe(false);
    expect(limiter.canPerformOperation('b')).toBe(true);
  });

  it('uses default constructor values', () => {
    const defaultLimiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(defaultLimiter.canPerformOperation('test')).toBe(true);
    }
    expect(defaultLimiter.canPerformOperation('test')).toBe(false);
  });
});
