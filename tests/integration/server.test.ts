import { describe, it, expect, vi } from 'vitest';

// Test that the MCP server can be instantiated with mocked dependencies
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation((info: any, caps: any) => ({
    info,
    caps,
    setRequestHandler: vi.fn(),
    connect: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: 'CallToolRequestSchema',
  ListToolsRequestSchema: 'ListToolsRequestSchema',
}));

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BaseToolWrapper } from '../../src/tools/base.js';
import { NmapTool } from '../../src/tools/nmap.js';
import { NucleiTool } from '../../src/tools/nuclei.js';
import { DirsearchTool } from '../../src/tools/dirsearch.js';
import { SqlmapTool } from '../../src/tools/sqlmap.js';
import { HydraTool } from '../../src/tools/hydra.js';
import { AcunetixTool } from '../../src/tools/acunetix.js';
import { MsfRpcTool } from '../../src/tools/msfrpc.js';

describe('KaliMCPServer Integration', () => {
  it('creates 7 tool instances with correct names', () => {
    const tools: BaseToolWrapper[] = [
      new NmapTool(),
      new NucleiTool(),
      new DirsearchTool(),
      new SqlmapTool(),
      new HydraTool(),
      new AcunetixTool(),
      new MsfRpcTool(),
    ];

    expect(tools).toHaveLength(7);
    const names = tools.map(t => t.name);
    expect(names).toContain('nmap');
    expect(names).toContain('nuclei');
    expect(names).toContain('dirsearch');
    expect(names).toContain('sqlmap');
    expect(names).toContain('hydra');
    expect(names).toContain('acunetix');
    expect(names).toContain('msfrpc');
  });

  it('each tool has valid definition', () => {
    const tools: BaseToolWrapper[] = [
      new NmapTool(),
      new NucleiTool(),
      new DirsearchTool(),
      new SqlmapTool(),
      new HydraTool(),
      new AcunetixTool(),
      new MsfRpcTool(),
    ];

    for (const tool of tools) {
      const def = tool.getToolDefinition();
      expect(def.name).toBeDefined();
      expect(def.description).toBeDefined();
      expect(def.inputSchema).toBeDefined();
    }
  });

  it('tool map works correctly', () => {
    const toolMap = new Map<string, BaseToolWrapper>();
    const tools: BaseToolWrapper[] = [
      new NmapTool(),
      new NucleiTool(),
    ];

    for (const tool of tools) {
      toolMap.set(tool.name, tool);
    }

    expect(toolMap.get('nmap')).toBeDefined();
    expect(toolMap.get('nuclei')).toBeDefined();
    expect(toolMap.get('nonexistent')).toBeUndefined();
  });
});
