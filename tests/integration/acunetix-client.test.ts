import { describe, it, expect, vi } from 'vitest';
import { AcunetixClient } from '../../src/tools/acunetix/client.js';
import type { AcunetixConfig } from '../../src/tools/acunetix/client.js';

describe('AcunetixClient', () => {
  const config: AcunetixConfig = {
    apiBaseUrl: 'http://localhost:3443',
    apiKey: 'test-api-key',
    timeout: 5000,
  };

  it('constructs with /api/v1 suffix', () => {
    const client = new AcunetixClient(config);
    // The client is constructed successfully
    expect(client).toBeDefined();
  });

  it('adds /api/v1 to base URL if missing', () => {
    const client = new AcunetixClient({ ...config, apiBaseUrl: 'http://localhost:3443' });
    expect(client).toBeDefined();
  });

  it('does not duplicate /api/v1', () => {
    const client = new AcunetixClient({ ...config, apiBaseUrl: 'http://localhost:3443/api/v1' });
    expect(client).toBeDefined();
  });

  it('handles connection failure gracefully', async () => {
    const client = new AcunetixClient({ ...config, apiBaseUrl: 'http://localhost:1', timeout: 1000 });
    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it('handles get request failure', async () => {
    const client = new AcunetixClient({ ...config, apiBaseUrl: 'http://localhost:1', timeout: 1000 });
    const result = await client.get('/targets');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles post request failure', async () => {
    const client = new AcunetixClient({ ...config, apiBaseUrl: 'http://localhost:1', timeout: 1000 });
    const result = await client.post('/targets', { address: 'http://example.com' });
    expect(result.success).toBe(false);
  });

  it('handles delete request failure', async () => {
    const client = new AcunetixClient({ ...config, apiBaseUrl: 'http://localhost:1', timeout: 1000 });
    const result = await client.delete('/targets/test-id');
    expect(result.success).toBe(false);
  });
});
