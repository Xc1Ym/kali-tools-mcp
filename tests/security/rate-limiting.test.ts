import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../../src/validators/safety.js';

describe('Rate Limiting Security Tests', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(60000, 3);
  });

  it('allows exactly maxOperations calls', () => {
    expect(limiter.canPerformOperation('test')).toBe(true);
    expect(limiter.canPerformOperation('test')).toBe(true);
    expect(limiter.canPerformOperation('test')).toBe(true);
  });

  it('blocks maxOperations + 1 call', () => {
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    expect(limiter.canPerformOperation('test')).toBe(false);
  });

  it('recovers after reset(identifier)', () => {
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    limiter.canPerformOperation('test');
    limiter.reset('test');
    expect(limiter.canPerformOperation('test')).toBe(true);
  });

  it('recovers after reset()', () => {
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('a');
    limiter.reset();
    expect(limiter.canPerformOperation('a')).toBe(true);
  });

  it('tracks different identifiers independently', () => {
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('a');
    limiter.canPerformOperation('a');
    expect(limiter.canPerformOperation('a')).toBe(false);
    expect(limiter.canPerformOperation('b')).toBe(true);
    expect(limiter.canPerformOperation('b')).toBe(true);
    expect(limiter.canPerformOperation('b')).toBe(true);
    expect(limiter.canPerformOperation('b')).toBe(false);
  });

  it('uses default 10 operations per 60000ms window', () => {
    const defaultLimiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(defaultLimiter.canPerformOperation('test')).toBe(true);
    }
    expect(defaultLimiter.canPerformOperation('test')).toBe(false);
  });

  it('handles many different identifiers', () => {
    for (let i = 0; i < 100; i++) {
      expect(limiter.canPerformOperation(`id-${i}`)).toBe(true);
    }
  });
});
