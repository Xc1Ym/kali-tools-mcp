import { describe, it, expect } from 'vitest';
import { SqlmapTool } from '../../../src/tools/sqlmap.js';

const tool = new SqlmapTool();

describe('SqlmapTool', () => {
  describe('validateParams', () => {
    it('requires targets', () => {
      expect(tool.validateParams({}).valid).toBe(false);
    });

    it('accepts valid URL with parameters', () => {
      expect(tool.validateParams({ targets: 'http://example.com/page?id=1' }).valid).toBe(true);
    });

    it('warns about URL without parameters', () => {
      const result = tool.validateParams({ targets: 'http://example.com/page' });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('accepts domain target', () => {
      expect(tool.validateParams({ targets: 'example.com' }).valid).toBe(true);
    });

    it('rejects invalid target', () => {
      expect(tool.validateParams({ targets: '!!!bad' }).valid).toBe(false);
    });

    it('validates level 1-5', () => {
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', level: 1 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', level: 5 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', level: 0 }).valid).toBe(false);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', level: 6 }).valid).toBe(false);
    });

    it('validates risk 1-3', () => {
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', risk: 1 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', risk: 3 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', risk: 0 }).valid).toBe(false);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', risk: 4 }).valid).toBe(false);
    });

    it('validates threads 1-10', () => {
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', threads: 1 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', threads: 10 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'http://example.com/?id=1', threads: 11 }).valid).toBe(false);
    });

    it('warns about high level', () => {
      const result = tool.validateParams({ targets: 'http://example.com/?id=1', level: 4 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns about high risk', () => {
      const result = tool.validateParams({ targets: 'http://example.com/?id=1', risk: 3 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('buildArgs', () => {
    it('always includes --batch', () => {
      expect(tool.buildArgs({ targets: 'http://example.com/?id=1' })).toContain('--batch');
    });

    it('uses -u for single target', () => {
      const args = tool.buildArgs({ targets: 'http://example.com/?id=1' });
      expect(args).toContain('-u');
      expect(args).toContain('http://example.com/?id=1');
    });

    it('uses -m for multiple targets', () => {
      const args = tool.buildArgs({ targets: ['http://a.com/?id=1', 'http://b.com/?id=1'] });
      expect(args).toContain('-m');
    });

    it('includes level', () => {
      const args = tool.buildArgs({ targets: 'http://example.com/?id=1', level: 3 });
      expect(args).toContain('--level');
      expect(args).toContain('3');
    });

    it('includes risk', () => {
      const args = tool.buildArgs({ targets: 'http://example.com/?id=1', risk: 2 });
      expect(args).toContain('--risk');
      expect(args).toContain('2');
    });

    it('includes default threads 5', () => {
      const args = tool.buildArgs({ targets: 'http://example.com/?id=1' });
      expect(args).toContain('--threads');
      expect(args).toContain('5');
    });

    it('includes dbms', () => {
      const args = tool.buildArgs({ targets: 'http://example.com/?id=1', dbms: 'MySQL' });
      expect(args).toContain('--dbms');
      expect(args).toContain('MySQL');
    });

    it('includes enumeration flags', () => {
      const args = tool.buildArgs({ targets: 'http://example.com/?id=1', dbs: true, tables: true, columns: true });
      expect(args).toContain('--dbs');
      expect(args).toContain('--tables');
      expect(args).toContain('--columns');
    });
  });

  describe('parseOutput', () => {
    it('handles empty output', () => {
      const result = tool.parseOutput('', '');
      expect(result.vulnerabilities).toEqual([]);
      expect(result.databases).toEqual([]);
      expect(result.summary.totalVulnerabilities).toBe(0);
    });
  });
});
