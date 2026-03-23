#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BaseToolWrapper } from './tools/base.js';

// Import tool wrappers
import { NmapTool } from './tools/nmap.js';
import { NucleiTool } from './tools/nuclei.js';
import { DirsearchTool } from './tools/dirsearch.js';
import { SqlmapTool } from './tools/sqlmap.js';
import { HydraTool } from './tools/hydra.js';
import { AcunetixTool } from './tools/acunetix.js';

/**
 * Kali MCP Server
 */
class KaliMCPServer {
  private server: Server;
  private tools: Map<string, BaseToolWrapper> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'kali-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Register a tool wrapper
   */
  registerTool(tool: BaseToolWrapper): void {
    this.tools.set(tool.name, tool);
    console.error(`Registered tool: ${tool.name}`);
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolDefinitions = Array.from(this.tools.values()).map((tool) =>
        tool.getToolDefinition()
      );

      return {
        tools: toolDefinitions,
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Get tool wrapper
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool ${name} not found`);
      }

      try {
        // Execute tool
        const result = await tool.execute(args || {});

        // Format response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kali MCP Server running on stdio');
  }
}

/**
 * Main entry point
 */
async function main() {
  const server = new KaliMCPServer();

  // Register tools
  server.registerTool(new NmapTool());
  server.registerTool(new NucleiTool());
  server.registerTool(new DirsearchTool());
  server.registerTool(new SqlmapTool());
  server.registerTool(new HydraTool());
  server.registerTool(new AcunetixTool());

  await server.start();
}

// Start server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
