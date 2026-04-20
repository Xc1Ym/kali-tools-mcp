import { describe, it, expect, vi } from 'vitest';
import type { SecurityConfig } from '../../../src/utils/security.js';

const defaultConfig: SecurityConfig = {
  allowedTargets: [],
  blockedTargets: ['localhost', '127.0.0.1', '0.0.0.0', '::1'],
  blockedRanges: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
  defaultTimeout: 300,
  maxConcurrentScans: 3,
  logLevel: 'info',
  requireConfirmationFor: ['aggressive_scan', 'brute_force', 'exploitation'],
};

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  appendFile: vi.fn().mockResolvedValue(undefined),
}));

import { isTargetAllowed, sanitizeInput, logSecurityEvent } from '../../../src/utils/security.js';

describe('isTargetAllowed', () => {
  it('blocks targets in blocked list', () => {
    expect(isTargetAllowed('localhost', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('127.0.0.1', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('0.0.0.0', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('::1', defaultConfig).allowed).toBe(false);
  });

  it('blocks localhost variants', () => {
    expect(isTargetAllowed('LOCALHOST', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('127.0.0.2', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('127.1.1.1', defaultConfig).allowed).toBe(false);
  });

  it('blocks private IP ranges', () => {
    expect(isTargetAllowed('10.0.0.1', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('10.255.255.255', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('172.16.0.1', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('172.31.255.255', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('192.168.1.1', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('169.254.1.1', defaultConfig).allowed).toBe(false);
  });

  it('blocks IPv6 private ranges', () => {
    expect(isTargetAllowed('fc00::1', defaultConfig).allowed).toBe(false);
    expect(isTargetAllowed('fe80::1', defaultConfig).allowed).toBe(false);
  });

  it('allows public IPs when no whitelist', () => {
    expect(isTargetAllowed('8.8.8.8', defaultConfig).allowed).toBe(true);
    expect(isTargetAllowed('1.1.1.1', defaultConfig).allowed).toBe(true);
  });

  it('enforces whitelist when configured', () => {
    const whitelistConfig: SecurityConfig = {
      ...defaultConfig,
      allowedTargets: ['192.168.1.0/24', 'example.com'],
    };
    expect(isTargetAllowed('192.168.1.5', whitelistConfig).allowed).toBe(true);
    expect(isTargetAllowed('example.com', whitelistConfig).allowed).toBe(true);
    expect(isTargetAllowed('8.8.8.8', whitelistConfig).allowed).toBe(false);
    expect(isTargetAllowed('192.168.2.1', whitelistConfig).allowed).toBe(false);
  });

  it('whitelist does not override blocked targets', () => {
    const configWithWhitelist: SecurityConfig = {
      ...defaultConfig,
      allowedTargets: ['127.0.0.1'],
    };
    expect(isTargetAllowed('127.0.0.1', configWithWhitelist).allowed).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('accepts clean input', () => {
    expect(sanitizeInput('normal input')).toBe(true);
    expect(sanitizeInput('192.168.1.1')).toBe(true);
    expect(sanitizeInput('')).toBe(true);
  });

  it('blocks shell metacharacters', () => {
    expect(sanitizeInput('cmd;rm -rf')).toBe(false);
    expect(sanitizeInput('cmd|pipe')).toBe(false);
    expect(sanitizeInput('cmd`backtick`')).toBe(false);
    expect(sanitizeInput('$(cmd)')).toBe(false);
    expect(sanitizeInput('cmd&bg')).toBe(false);
    expect(sanitizeInput('cmd<redirect')).toBe(false);
    expect(sanitizeInput('cmd>redirect')).toBe(false);
  });

  it('blocks path traversal', () => {
    expect(sanitizeInput('../../../etc/passwd')).toBe(false);
  });
});

describe('logSecurityEvent', () => {
  it('writes JSON log entry without throwing', async () => {
    // Verify no error thrown when logging
    await expect(logSecurityEvent('test_event', { key: 'value' })).resolves.toBeUndefined();
  });
});
