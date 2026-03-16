import { z } from 'zod';
import { executeCommand, commandExists, sanitizeArgs } from '../utils/command.js';
import { isTargetAllowed, loadConfig, logSecurityEvent } from '../utils/security.js';
import { assessScanRisk, SafetyLevel } from '../validators/safety.js';
import { normalizeTarget, isValidIPv4, isValidIPv6, isValidDomain } from '../validators/network.js';

/**
 * Base interface for tool parameters
 */
export interface ToolParams {
  [key: string]: any;
}

/**
 * Base interface for tool execution result
 */
export interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
  metadata: {
    tool: string;
    duration: number;
    timestamp: string;
    [key: string]: any;
  };
}

/**
 * Base interface for validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Abstract base class for all tool wrappers
 */
export abstract class BaseToolWrapper {
  abstract name: string;
  abstract description: string;
  abstract version: string;

  /**
   * Validate parameters before execution
   */
  abstract validateParams(params: ToolParams): ValidationResult;

  /**
   * Build command arguments from parameters
   */
  abstract buildArgs(params: ToolParams): string[];

  /**
   * Parse command output into structured data
   */
  abstract parseOutput(stdout: string, stderr: string): any;

  /**
   * Check if tool is available
   */
  async checkAvailable(): Promise<boolean> {
    return await commandExists(this.name);
  }

  /**
   * Validate targets against security policy
   */
  protected async validateTargets(targets: string[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = await loadConfig();

    for (const target of targets) {
      const normalized = normalizeTarget(target);

      // Validate format
      if (!isValidIPv4(normalized) && !isValidIPv6(normalized) && !isValidDomain(normalized)) {
        errors.push(`Invalid target format: ${target}`);
        continue;
      }

      // Check security policy
      const check = isTargetAllowed(normalized, config);
      if (!check.allowed) {
        errors.push(`Target ${target} is not allowed: ${check.reason}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Assess risk of this operation
   */
  protected assessRisk(params: ToolParams): SafetyLevel {
    const assessment = assessScanRisk({
      targets: params.targets || [],
      aggressiveScan: params.aggressive || false,
      exploitAttempts: params.exploit || false,
      bruteForce: params.bruteForce || false,
    });

    return assessment.level;
  }

  /**
   * Execute the tool
   */
  async execute(params: ToolParams): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Check if tool is available
      const available = await this.checkAvailable();
      if (!available) {
        return {
          success: false,
          data: null,
          error: `Tool ${this.name} is not available on this system`,
          metadata: {
            tool: this.name,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Validate parameters
      const validation = this.validateParams(params);
      if (!validation.valid) {
        return {
          success: false,
          data: null,
          error: `Parameter validation failed: ${validation.errors.join(', ')}`,
          metadata: {
            tool: this.name,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Validate targets
      if (params.targets) {
        const targetValidation = await this.validateTargets(
          Array.isArray(params.targets) ? params.targets : [params.targets]
        );
        if (!targetValidation.valid) {
          return {
            success: false,
            data: null,
            error: `Target validation failed: ${targetValidation.errors.join(', ')}`,
            metadata: {
              tool: this.name,
              duration: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            },
          };
        }
      }

      // Assess risk
      const riskLevel = this.assessRisk(params);
      if (riskLevel === SafetyLevel.PROHIBITED) {
        await logSecurityEvent('operation_blocked', {
          tool: this.name,
          reason: 'Operation is prohibited',
          params,
        });
        return {
          success: false,
          data: null,
          error: 'This operation is not allowed',
          metadata: {
            tool: this.name,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Build command
      const args = this.buildArgs(params);

      // Sanitize arguments
      if (!sanitizeArgs(args)) {
        return {
          success: false,
          data: null,
          error: 'Command arguments contain potentially dangerous characters',
          metadata: {
            tool: this.name,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Log security event
      await logSecurityEvent('tool_execution', {
        tool: this.name,
        targets: params.targets,
        riskLevel,
      });

      // Load config for timeout
      const config = await loadConfig();
      const timeout = params.timeout || config.defaultTimeout * 1000;

      // Execute command
      const result = await executeCommand(this.name, args, { timeout });

      // Parse output
      const parsed = this.parseOutput(result.stdout, result.stderr);

      return {
        success: result.success,
        data: parsed,
        error: result.stderr || undefined,
        metadata: {
          tool: this.name,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          timedOut: result.timedOut,
          exitCode: result.exitCode,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tool: this.name,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get MCP tool definition
   */
  getToolDefinition(): any {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.getInputSchema(),
    };
  }

  /**
   * Get input schema for validation
   */
  abstract getInputSchema(): z.ZodSchema;
}
