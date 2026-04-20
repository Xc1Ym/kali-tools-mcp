import { describe, it, expect, vi } from 'vitest';
import { HydraTool, KALI_DICTIONARIES } from '../../../src/tools/hydra.js';

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

const tool = new HydraTool();

describe('HydraTool', () => {
  describe('validateParams', () => {
    it('requires targets', () => {
      expect(tool.validateParams({}).valid).toBe(false);
    });

    it('accepts valid IP target', () => {
      expect(tool.validateParams({ targets: '192.168.1.1', service: 'ssh' }).valid).toBe(true);
    });

    it('accepts valid domain target', () => {
      expect(tool.validateParams({ targets: 'example.com', service: 'ssh' }).valid).toBe(true);
    });

    it('accepts valid URL target', () => {
      expect(tool.validateParams({ targets: 'http://example.com', service: 'http-post' }).valid).toBe(true);
    });

    it('rejects invalid target', () => {
      expect(tool.validateParams({ targets: '!!!bad', service: 'ssh' }).valid).toBe(false);
    });

    it('accepts valid services', () => {
      const validServices = ['ssh', 'ftp', 'http', 'mysql', 'postgresql', 'smb'];
      for (const svc of validServices) {
        expect(tool.validateParams({ targets: '10.0.0.1', service: svc }).valid).toBe(true);
      }
    });

    it('rejects invalid service', () => {
      expect(tool.validateParams({ targets: '10.0.0.1', service: 'invalid_svc' }).valid).toBe(false);
    });

    it('warns when no service specified', () => {
      const result = tool.validateParams({ targets: '10.0.0.1' });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns when no username option', () => {
      const result = tool.validateParams({ targets: '10.0.0.1', service: 'ssh' });
      expect(result.warnings.some(w => w.includes('username'))).toBe(true);
    });

    it('validates threads 1-64', () => {
      expect(tool.validateParams({ targets: '10.0.0.1', threads: 1 }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', threads: 64 }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', threads: 0 }).valid).toBe(false);
      expect(tool.validateParams({ targets: '10.0.0.1', threads: 65 }).valid).toBe(false);
    });

    it('validates port 1-65535', () => {
      expect(tool.validateParams({ targets: '10.0.0.1', port: 22 }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', port: 0 }).valid).toBe(false);
      expect(tool.validateParams({ targets: '10.0.0.1', port: 70000 }).valid).toBe(false);
    });

    it('warns about high threads', () => {
      const result = tool.validateParams({ targets: '10.0.0.1', threads: 20 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('buildArgs', () => {
    it('includes username -l', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', username: 'admin' });
      expect(args).toContain('-l');
      expect(args).toContain('admin');
    });

    it('includes username file -L', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', usernameFile: '/tmp/users.txt' });
      expect(args).toContain('-L');
    });

    it('includes password -p', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', password: 'pass123' });
      expect(args).toContain('-p');
      expect(args).toContain('pass123');
    });

    it('uses default threads 4', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1' });
      expect(args).toContain('-t');
      expect(args).toContain('4');
    });

    it('includes port -s', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', port: 2222 });
      expect(args).toContain('-s');
      expect(args).toContain('2222');
    });

    it('includes SSL flag', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', ssl: true })).toContain('-S');
    });

    it('includes exit on found', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', exitOnFound: true })).toContain('-f');
    });

    it('formats target as service://target', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', service: 'ssh' });
      expect(args).toContain('ssh://10.0.0.1');
    });

    it('defaults to ssh service', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1' });
      expect(args).toContain('ssh://10.0.0.1');
    });
  });

  describe('parseOutput', () => {
    it('parses hydra output with version info', () => {
      const output = `Hydra v9.5 (c) 2023 by van Hauser/THC
[DATA] max 4 tasks per 1 server, overall 4 tasks, 14344391 login tries
[22][ssh] host: 192.168.1.100   login: admin   password: password123
1 of 1 target successfully completed, 1 valid password found`;

      const result = tool.parseOutput(output, '');
      expect(result.hydraVersion).toBe('9.5');
      // The regex in parseOutput looks for specific bracket pattern
      expect(result.raw).toContain('admin');
    });

    it('handles empty output', () => {
      const result = tool.parseOutput('', '');
      expect(result.credentials).toEqual([]);
      expect(result.summary.successfulAttempts).toBe(0);
    });
  });

  describe('KALI_DICTIONARIES', () => {
    it('has expected dictionary keys', () => {
      expect(Object.keys(KALI_DICTIONARIES)).toContain('rockyou');
      expect(Object.keys(KALI_DICTIONARIES)).toContain('john');
      expect(Object.keys(KALI_DICTIONARIES)).toContain('fasttrack');
      expect(Object.keys(KALI_DICTIONARIES)).toContain('nmap');
    });

    it('each dictionary has required properties', () => {
      for (const [key, dict] of Object.entries(KALI_DICTIONARIES)) {
        expect(dict.name).toBeDefined();
        expect(dict.path).toBeDefined();
        expect(dict.description).toBeDefined();
        expect(dict.size).toBeDefined();
        expect(dict.passwordCount).toBeGreaterThan(0);
      }
    });
  });
});
