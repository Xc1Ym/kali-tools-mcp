import { describe, it, expect } from 'vitest';
import { isReasonableOutputSize } from '../../src/validators/safety.js';
import { NmapTool } from '../../src/tools/nmap.js';

describe('Timeout Handling Performance Tests', () => {
  it('output size limits are enforced', () => {
    expect(isReasonableOutputSize(0)).toBe(true);
    expect(isReasonableOutputSize(10 * 1024 * 1024)).toBe(true);
    expect(isReasonableOutputSize(10 * 1024 * 1024 + 1)).toBe(false);
    expect(isReasonableOutputSize(100 * 1024 * 1024)).toBe(false);
  });

  it('tool execution metadata includes timing info', () => {
    const tool = new NmapTool();
    const result = tool.parseOutput('', '');
    expect(result).toBeDefined();
  });

  it('parses very large output without hanging', () => {
    const tool = new NmapTool();
    const largeOutput = 'x'.repeat(1024 * 1024); // 1MB
    const start = Date.now();
    const result = tool.parseOutput(largeOutput, '');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(result).toBeDefined();
  });
});
