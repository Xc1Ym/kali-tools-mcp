import { describe, it, expect } from 'vitest';
import { DirsearchTool } from '../../../src/tools/dirsearch.js';

const tool = new DirsearchTool();

describe('DirsearchTool', () => {
  describe('validateParams', () => {
    it('requires targets', () => {
      expect(tool.validateParams({}).valid).toBe(false);
    });

    it('accepts valid URL', () => {
      expect(tool.validateParams({ targets: 'http://example.com' }).valid).toBe(true);
    });

    it('accepts valid domain', () => {
      expect(tool.validateParams({ targets: 'example.com' }).valid).toBe(true);
    });

    it('accepts valid IP', () => {
      expect(tool.validateParams({ targets: '192.168.1.1' }).valid).toBe(true);
    });

    it('rejects invalid target', () => {
      expect(tool.validateParams({ targets: '!!!bad' }).valid).toBe(false);
    });

    it('rejects invalid extension (empty)', () => {
      expect(tool.validateParams({ targets: 'example.com', extensions: [''] }).valid).toBe(false);
    });

    it('validates threads 1-50', () => {
      expect(tool.validateParams({ targets: 'example.com', threads: 1 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'example.com', threads: 50 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'example.com', threads: 0 }).valid).toBe(false);
      expect(tool.validateParams({ targets: 'example.com', threads: 51 }).valid).toBe(false);
    });

    it('validates depth 1-10', () => {
      expect(tool.validateParams({ targets: 'example.com', depth: 1 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'example.com', depth: 10 }).valid).toBe(true);
      expect(tool.validateParams({ targets: 'example.com', depth: 0 }).valid).toBe(false);
      expect(tool.validateParams({ targets: 'example.com', depth: 11 }).valid).toBe(false);
    });

    it('warns about high threads', () => {
      const result = tool.validateParams({ targets: 'example.com', threads: 30 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns about deep recursive scan', () => {
      const result = tool.validateParams({ targets: 'example.com', recursive: true, depth: 5 });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('buildArgs', () => {
    it('includes target with -u flag', () => {
      const args = tool.buildArgs({ targets: 'http://example.com' });
      expect(args).toContain('-u');
      expect(args).toContain('http://example.com');
    });

    it('uses default extensions when none specified', () => {
      const args = tool.buildArgs({ targets: 'http://example.com' });
      expect(args).toContain('-e');
      expect(args).toContain('php,html,js,txt');
    });

    it('uses custom extensions', () => {
      const args = tool.buildArgs({ targets: 'http://example.com', extensions: ['asp', 'aspx'] });
      expect(args).toContain('asp,aspx');
    });

    it('uses default threads 10', () => {
      const args = tool.buildArgs({ targets: 'http://example.com' });
      expect(args).toContain('--threads');
      expect(args).toContain('10');
    });

    it('includes recursive flag', () => {
      const args = tool.buildArgs({ targets: 'http://example.com', recursive: true });
      expect(args).toContain('-r');
    });

    it('includes no-color', () => {
      expect(tool.buildArgs({ targets: 'http://example.com' })).toContain('--no-color');
    });
  });

  describe('parseOutput', () => {
    it('handles empty output', () => {
      const result = tool.parseOutput('', '');
      expect(result.directories).toEqual([]);
      expect(result.files).toEqual([]);
      expect(result.summary.totalFound).toBe(0);
    });
  });
});
