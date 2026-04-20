import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseToolWrapper } from '../../../src/tools/base.js';
import { z } from 'zod';

const mockCommandExists = vi.fn().mockResolvedValue(true);
const mockExecuteCommand = vi.fn();
const mockSanitizeArgs = vi.fn().mockReturnValue(true);
const mockIsTargetAllowed = vi.fn().mockReturnValue({ allowed: true });
const mockLoadConfig = vi.fn().mockResolvedValue({
  allowedTargets: [],
  blockedTargets: ['localhost', '127.0.0.1'],
  blockedRanges: [],
  defaultTimeout: 300,
  maxConcurrentScans: 3,
  logLevel: 'info',
  requireConfirmationFor: [],
});
const mockLogSecurityEvent = vi.fn();

vi.mock('../../../src/utils/command.js', () => ({
  executeCommand: (...args: any[]) => mockExecuteCommand(...args),
  commandExists: (...args: any[]) => mockCommandExists(...args),
  sanitizeArgs: (...args: any[]) => mockSanitizeArgs(...args),
}));

vi.mock('../../../src/utils/security.js', () => ({
  isTargetAllowed: (...args: any[]) => mockIsTargetAllowed(...args),
  loadConfig: (...args: any[]) => mockLoadConfig(...args),
  logSecurityEvent: (...args: any[]) => mockLogSecurityEvent(...args),
}));

class TestTool extends BaseToolWrapper {
  name = 'testtool';
  description = 'A test tool';
  version = '1.0.0';

  validateParams(params: any) {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!params.targets) errors.push('targets required');
    if (params.forceInvalid) errors.push('forced invalid');
    return { valid: errors.length === 0, errors, warnings };
  }

  buildArgs(params: any): string[] {
    return [params.targets];
  }

  parseOutput(stdout: string, stderr: string) {
    return { stdout, stderr };
  }

  getInputSchema(): z.ZodSchema {
    return z.object({ targets: z.string() });
  }
}

describe('BaseToolWrapper', () => {
  let tool: TestTool;

  beforeEach(() => {
    tool = new TestTool();
    mockCommandExists.mockResolvedValue(true);
    mockCommandExists.mockClear();
    mockExecuteCommand.mockClear();
    mockSanitizeArgs.mockReturnValue(true);
    mockSanitizeArgs.mockClear();
    mockIsTargetAllowed.mockReturnValue({ allowed: true });
    mockIsTargetAllowed.mockClear();
    mockLoadConfig.mockResolvedValue({
      allowedTargets: [],
      blockedTargets: [],
      blockedRanges: [],
      defaultTimeout: 300,
      maxConcurrentScans: 3,
      logLevel: 'info',
      requireConfirmationFor: [],
    });
    mockLoadConfig.mockClear();
    mockLogSecurityEvent.mockClear();
  });

  describe('execute', () => {
    it('returns failure when tool is not available', async () => {
      mockCommandExists.mockResolvedValue(false);
      const result = await tool.execute({ targets: 'example.com' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('returns failure when params invalid', async () => {
      const result = await tool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('returns failure when target is blocked', async () => {
      mockIsTargetAllowed.mockReturnValue({ allowed: false, reason: 'blocked' });
      const result = await tool.execute({ targets: '127.0.0.1' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Target validation failed');
    });

    it('returns failure for PROHIBITED risk level', async () => {
      const result = await tool.execute({ targets: 'example.com', exploit: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('returns failure when args contain dangerous chars', async () => {
      mockSanitizeArgs.mockReturnValue(false);
      const result = await tool.execute({ targets: 'example.com' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous characters');
    });

    it('returns success on normal execution', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });
      const result = await tool.execute({ targets: 'example.com' });
      expect(result.success).toBe(true);
      expect(result.data.stdout).toBe('output');
      expect(result.metadata.tool).toBe('testtool');
    });

    it('catches exceptions during execution', async () => {
      mockCommandExists.mockRejectedValue(new Error('unexpected'));
      const result = await tool.execute({ targets: 'example.com' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('unexpected');
    });

    it('includes metadata in result', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true, stdout: '', stderr: '', exitCode: 0, timedOut: false,
      });
      const result = await tool.execute({ targets: 'example.com' });
      expect(result.metadata.tool).toBe('testtool');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.duration).toBeDefined();
    });
  });

  describe('getToolDefinition', () => {
    it('returns name, description, inputSchema', () => {
      const def = tool.getToolDefinition();
      expect(def.name).toBe('testtool');
      expect(def.description).toBe('A test tool');
      expect(def.inputSchema).toBeDefined();
    });
  });
});
