import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('msfrpc', () => {
  return {
    default: class MsfRpcMock {
      connect = vi.fn().mockResolvedValue(undefined);
      auth = { logout: vi.fn() };
      core = {
        version: vi.fn().mockResolvedValue({ version: '6.3.44' }),
        moduleStats: vi.fn().mockResolvedValue({ exploits: 2500, auxiliaries: 1200 }),
      };
    },
  };
});

import { MsfRpcClient } from '../../src/tools/msfrpc/client.js';

describe('MsfRpcClient', () => {
  const config = {
    host: '127.0.0.1',
    port: 55553,
    username: 'msf',
    password: 'test',
  };

  it('reports not connected after disconnect', async () => {
    const client = new MsfRpcClient(config);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('connects to MSFRPC and reports connected', async () => {
    const client = new MsfRpcClient(config);
    const result = await client.connect();
    expect(result.success).toBe(true);
    expect(client.isConnected()).toBe(true);
  });

  it('gets version info after connect', async () => {
    const client = new MsfRpcClient(config);
    await client.connect();
    const result = await client.getVersion();
    expect(result.success).toBe(true);
  });

  it('gets stats after connect', async () => {
    const client = new MsfRpcClient(config);
    await client.connect();
    const result = await client.getStats();
    expect(result.success).toBe(true);
  });

  it('auto-connects on call if not connected', async () => {
    const client = new MsfRpcClient(config);
    const result = await client.call('core.version');
    expect(result.success).toBe(true);
  });

  it('disconnects and reports not connected', async () => {
    const client = new MsfRpcClient(config);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
  });
});
