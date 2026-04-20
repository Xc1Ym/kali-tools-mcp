import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../../src/validators/safety.js';
import { NmapTool } from '../../src/tools/nmap.js';

describe('Concurrent Operations Performance Tests', () => {
  it('RateLimiter handles many concurrent checks', () => {
    const limiter = new RateLimiter(60000, 1000);
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(Promise.resolve(limiter.canPerformOperation('concurrent')));
    }
    return Promise.all(promises).then(results => {
      expect(results.every(r => r === true)).toBe(true);
    });
  });

  it('multiple tool instances operate independently', () => {
    const tools = [new NmapTool(), new NmapTool(), new NmapTool()];
    const results = tools.map(t => t.validateParams({ targets: '8.8.8.8' }));
    expect(results.every(r => r.valid)).toBe(true);
  });
});
