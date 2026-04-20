import { describe, it, expect } from 'vitest';
import { NmapTool } from '../../../src/tools/nmap.js';
import fs from 'fs';

const tool = new NmapTool();

describe('NmapTool', () => {
  describe('validateParams', () => {
    it('requires targets', () => {
      const result = tool.validateParams({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('targets parameter is required');
    });

    it('accepts valid IP target', () => {
      expect(tool.validateParams({ targets: '192.168.1.1' }).valid).toBe(true);
    });

    it('accepts valid domain target', () => {
      expect(tool.validateParams({ targets: 'example.com' }).valid).toBe(true);
    });

    it('accepts valid CIDR target', () => {
      expect(tool.validateParams({ targets: '192.168.0.0/24' }).valid).toBe(true);
    });

    it('rejects invalid target', () => {
      const result = tool.validateParams({ targets: 'not-valid!!!' });
      expect(result.valid).toBe(false);
    });

    it('validates ports array', () => {
      expect(tool.validateParams({ targets: '10.0.0.1', ports: [80, 443] }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', ports: [0] }).valid).toBe(false);
      expect(tool.validateParams({ targets: '10.0.0.1', ports: [70000] }).valid).toBe(false);
    });

    it('validates port range string', () => {
      expect(tool.validateParams({ targets: '10.0.0.1', ports: '1-1000' }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', ports: '1000-1' }).valid).toBe(false);
      expect(tool.validateParams({ targets: '10.0.0.1', ports: '1-70000' }).valid).toBe(false);
    });

    it('validates timing 0-5', () => {
      expect(tool.validateParams({ targets: '10.0.0.1', timing: 0 }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', timing: 5 }).valid).toBe(true);
      expect(tool.validateParams({ targets: '10.0.0.1', timing: 6 }).valid).toBe(false);
      expect(tool.validateParams({ targets: '10.0.0.1', timing: -1 }).valid).toBe(false);
    });

    it('warns about aggressive scans', () => {
      const result = tool.validateParams({ targets: '10.0.0.1', aggressive: true });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('warns about script scans', () => {
      const result = tool.validateParams({ targets: '10.0.0.1', scripts: ['vuln'] });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('buildArgs', () => {
    it('includes scan type flags', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', scanType: 'tcpSyn' })).toContain('-sS');
      expect(tool.buildArgs({ targets: '10.0.0.1', scanType: 'tcpConnect' })).toContain('-sT');
      expect(tool.buildArgs({ targets: '10.0.0.1', scanType: 'udp' })).toContain('-sU');
      expect(tool.buildArgs({ targets: '10.0.0.1', scanType: 'ping' })).toContain('-sn');
    });

    it('includes port specification', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', ports: [80, 443] });
      expect(args).toContain('-p');
      expect(args).toContain('80,443');
    });

    it('includes service detection', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', serviceDetection: true })).toContain('-sV');
    });

    it('includes OS detection', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', osDetection: true })).toContain('-O');
    });

    it('includes aggressive flag', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', aggressive: true })).toContain('-A');
    });

    it('includes scripts', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1', scripts: ['vuln', 'auth'] });
      expect(args).toContain('--script');
      expect(args).toContain('vuln,auth');
    });

    it('includes timing template', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', timing: 4 })).toContain('-T4');
    });

    it('includes XML and normal output flags', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1' });
      expect(args).toContain('-oX');
      expect(args).toContain('-oN');
    });

    it('includes verbose flag', () => {
      expect(tool.buildArgs({ targets: '10.0.0.1', verbose: true })).toContain('-v');
    });

    it('appends targets at end', () => {
      const args = tool.buildArgs({ targets: '10.0.0.1' });
      expect(args[args.length - 1]).toBe('10.0.0.1');
    });

    it('handles multiple targets', () => {
      const args = tool.buildArgs({ targets: ['10.0.0.1', '10.0.0.2'] });
      expect(args).toContain('10.0.0.1');
      expect(args).toContain('10.0.0.2');
    });
  });

  describe('parseOutput', () => {
    it('parses nmap XML with hosts', () => {
      const xml = fs.readFileSync('tests/fixtures/nmap-output.xml', 'utf-8');
      const result = tool.parseOutput(xml, '');
      expect(result.hosts.length).toBe(2);
      expect(result.hosts[0].ip).toBe('192.168.1.1');
      expect(result.hosts[0].hostnames).toContain('router.local');
      expect(result.hosts[0].ports.length).toBe(3); // only open ports
      expect(result.hosts[0].os.length).toBeGreaterThan(0);
    });

    it('parses empty output', () => {
      const result = tool.parseOutput('', '');
      expect(result.hosts).toEqual([]);
    });

    it('parses stats line', () => {
      const result = tool.parseOutput('Nmap done: 5 IP addresses (2 hosts up) scanned in 10s\nNmap done: 5 IP addresses (2 hosts up) up in 10s', '');
      expect(result.stats).toBeDefined();
    });
  });

  describe('getToolDefinition', () => {
    it('returns name, description, inputSchema', () => {
      const def = tool.getToolDefinition();
      expect(def.name).toBe('nmap');
      expect(def.description).toBeDefined();
      expect(def.inputSchema).toBeDefined();
    });
  });

  describe('getInputSchema', () => {
    it('parses valid input', () => {
      const schema = tool.getInputSchema();
      expect(() => schema.parse({ targets: '10.0.0.1' })).not.toThrow();
    });
  });
});
