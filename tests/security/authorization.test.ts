import { describe, it, expect } from 'vitest';
import { requiresConfirmation } from '../../src/utils/security.js';
import type { SecurityConfig } from '../../src/utils/security.js';

const config: SecurityConfig = {
  allowedTargets: [],
  blockedTargets: ['localhost'],
  blockedRanges: ['10.0.0.0/8'],
  defaultTimeout: 300,
  maxConcurrentScans: 3,
  logLevel: 'info',
  requireConfirmationFor: ['aggressive_scan', 'brute_force', 'exploitation'],
};

describe('Authorization Security Tests', () => {
  describe('requireConfirmationFor', () => {
    it('flags aggressive_scan operations', () => {
      expect(requiresConfirmation('aggressive_scan', config)).toBe(true);
    });

    it('flags brute_force operations', () => {
      expect(requiresConfirmation('brute_force', config)).toBe(true);
    });

    it('flags exploitation operations', () => {
      expect(requiresConfirmation('exploitation', config)).toBe(true);
    });

    it('does not flag normal operations', () => {
      expect(requiresConfirmation('port_scan', config)).toBe(false);
      expect(requiresConfirmation('vulnerability_scan', config)).toBe(false);
    });
  });

  describe('SecurityConfig defaults', () => {
    it('includes standard blocked targets', () => {
      expect(config.blockedTargets).toContain('localhost');
    });

    it('includes standard blocked ranges', () => {
      expect(config.blockedRanges).toContain('10.0.0.0/8');
    });

    it('includes default timeout', () => {
      expect(config.defaultTimeout).toBe(300);
    });
  });
});
