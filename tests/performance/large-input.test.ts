import { describe, it, expect } from 'vitest';
import { NmapTool } from '../../src/tools/nmap.js';
import { NucleiTool } from '../../src/tools/nuclei.js';
import { isValidIPv4, isValidDomain } from '../../src/validators/network.js';
import { isSafeArgument } from '../../src/validators/safety.js';

describe('Large Input Performance Tests', () => {
  it('validates 100 targets quickly', () => {
    const tool = new NmapTool();
    const targets = Array.from({ length: 100 }, (_, i) => `10.0.${Math.floor(i / 255)}.${i % 255 + 1}`);
    const start = Date.now();
    const result = tool.validateParams({ targets });
    const elapsed = Date.now() - start;
    expect(result.valid).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });

  it('validates 1000 targets', () => {
    const tool = new NmapTool();
    const targets = Array.from({ length: 1000 }, (_, i) => `8.${Math.floor(i / 65536)}.${Math.floor(i / 256) % 256}.${i % 256}`);
    const start = Date.now();
    const result = tool.validateParams({ targets });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('handles long domain names', () => {
    const longDomain = 'a'.repeat(60) + '.com';
    const result = isValidDomain(longDomain);
    expect(typeof result).toBe('boolean');
  });

  it('handles large nmap XML output', () => {
    const tool = new NmapTool();
    const hosts = Array.from({ length: 100 }, (_, i) => `
<host>
<address addr="10.0.0.${i + 1}" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="80"><state state="open"/></port>
</ports>
</host>`).join('');

    const xml = `<?xml version="1.0"?><nmaprun>${hosts}</nmaprun>`;
    const start = Date.now();
    const result = tool.parseOutput(xml, '');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(result.hosts.length).toBe(100);
  });

  it('handles 1000 lines of nuclei JSONL', () => {
    const tool = new NucleiTool();
    const lines = Array.from({ length: 1000 }, (_, i) =>
      JSON.stringify({ template: `test-${i}`, info: { severity: 'info' }, host: 'http://example.com', 'matched-at': 'http://example.com' })
    ).join('\n');

    const start = Date.now();
    const result = tool.parseOutput(lines, '');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
    expect(result.vulnerabilities.length).toBe(1000);
  });

  it('sanitizeArgs handles large argument arrays', () => {
    const args = Array.from({ length: 1000 }, (_, i) => `arg-${i}`);
    const start = Date.now();
    const result = isSafeArgument(args.join(' '));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(result).toBe(true);
  });
});
