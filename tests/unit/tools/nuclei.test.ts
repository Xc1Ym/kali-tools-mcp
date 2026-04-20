import { describe, it, expect } from 'vitest';
import { NucleiTool } from '../../../src/tools/nuclei.js';
import fs from 'fs';

const tool = new NucleiTool();

describe('NucleiTool', () => {
  describe('validateParams', () => {
    it('requires targets', () => {
      expect(tool.validateParams({}).valid).toBe(false);
    });

    it('accepts valid URL target', () => {
      expect(tool.validateParams({ targets: 'http://example.com' }).valid).toBe(true);
    });

    it('accepts valid domain', () => {
      expect(tool.validateParams({ targets: 'example.com' }).valid).toBe(true);
    });

    it('rejects invalid target', () => {
      expect(tool.validateParams({ targets: '!!!invalid' }).valid).toBe(false);
    });

    it('validates severity array', () => {
      expect(tool.validateParams({ targets: 'example.com', severity: ['critical', 'high'] }).valid).toBe(true);
    });

    it('validates severity string', () => {
      expect(tool.validateParams({ targets: 'example.com', severity: 'critical,high' }).valid).toBe(true);
    });

    it('rejects invalid severity', () => {
      expect(tool.validateParams({ targets: 'example.com', severity: ['extreme'] }).valid).toBe(false);
    });

    it('rejects empty template', () => {
      expect(tool.validateParams({ targets: 'example.com', templates: [''] }).valid).toBe(false);
    });

    it('warns about aggressive scanning', () => {
      const result = tool.validateParams({ targets: 'example.com', aggressive: true });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('buildArgs', () => {
    it('always includes silent, jsonl, no-color', () => {
      const args = tool.buildArgs({ targets: 'example.com' });
      expect(args).toContain('-silent');
      expect(args).toContain('-jsonl');
      expect(args).toContain('-no-color');
    });

    it('includes severity filter', () => {
      const args = tool.buildArgs({ targets: 'example.com', severity: ['critical', 'high'] });
      expect(args).toContain('-severity');
      expect(args).toContain('critical,high');
    });

    it('includes templates', () => {
      const args = tool.buildArgs({ targets: 'example.com', templates: ['cves/', 'vulns/'] });
      expect(args).toContain('-templates');
      expect(args).toContain('cves/,vulns/');
    });

    it('uses default templates when none specified', () => {
      const args = tool.buildArgs({ targets: 'example.com' });
      expect(args).toContain('-templates');
    });

    it('includes rate limiting', () => {
      const args = tool.buildArgs({ targets: 'example.com', rateLimit: 100 });
      expect(args).toContain('-rate-limit');
      expect(args).toContain('100');
    });

    it('includes concurrency', () => {
      const args = tool.buildArgs({ targets: 'example.com', concurrency: 25 });
      expect(args).toContain('-c');
      expect(args).toContain('25');
    });

    it('appends targets with -u flag', () => {
      const args = tool.buildArgs({ targets: 'http://example.com' });
      expect(args).toContain('-u');
      expect(args).toContain('http://example.com');
    });
  });

  describe('parseOutput', () => {
    it('parses JSONL vulnerabilities', () => {
      const output = fs.readFileSync('tests/fixtures/nuclei-output.jsonl', 'utf-8');
      const result = tool.parseOutput(output, '');
      expect(result.vulnerabilities.length).toBe(5);
      expect(result.summary.total).toBe(5);
      expect(result.summary.critical).toBe(1);
      expect(result.summary.high).toBe(1);
      expect(result.summary.medium).toBe(1);
      expect(result.summary.info).toBe(1);
      expect(result.summary.low).toBe(1);
    });

    it('handles empty output', () => {
      const result = tool.parseOutput('', '');
      expect(result.vulnerabilities).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    it('skips non-JSON lines', () => {
      const result = tool.parseOutput('not json\n{"template":"test","info":{"severity":"info"}}', '');
      expect(result.vulnerabilities.length).toBe(1);
    });
  });
});
