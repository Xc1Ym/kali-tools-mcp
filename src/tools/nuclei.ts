import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import {
  isValidIPv4,
  isValidIPv6,
  isValidDomain,
  isValidURL,
  normalizeTarget,
} from '../validators/network.js';

/**
 * Nuclei tool wrapper for vulnerability scanning
 */
export class NucleiTool extends BaseToolWrapper {
  name = 'nuclei';
  description = 'Fast and customizable vulnerability scanner based on templates';
  version = '1.0.0';

  /**
   * Validate nuclei parameters
   */
  validateParams(params: ToolParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate targets
    if (!params.targets) {
      errors.push('targets parameter is required');
    } else {
      const targets = Array.isArray(params.targets) ? params.targets : [params.targets];
      for (const target of targets) {
        const normalized = target.toLowerCase().trim();
        if (!isValidIPv4(normalized) && !isValidIPv6(normalized) &&
            !isValidDomain(normalized) && !isValidURL(normalized)) {
          errors.push(`Invalid target: ${target}`);
        }
      }
    }

    // Validate severity if specified
    if (params.severity) {
      const validSeverities = ['critical', 'high', 'medium', 'low', 'info', 'unknown'];
      let severityList: string[];

      if (Array.isArray(params.severity)) {
        severityList = params.severity;
      } else {
        // Handle comma-separated string
        severityList = params.severity.split(',').map((s: string) => s.trim().toLowerCase());
      }

      for (const severity of severityList) {
        if (!validSeverities.includes(severity.toLowerCase())) {
          errors.push(`Invalid severity level: ${severity}`);
        }
      }
    }

    // Validate templates if specified
    if (params.templates && params.templates.length > 0) {
      for (const template of params.templates) {
        if (typeof template !== 'string' || template.trim().length === 0) {
          errors.push(`Invalid template: ${template}`);
        }
      }
    }

    // Warn about aggressive scanning
    if (params.aggressive || params.severity === 'critical') {
      warnings.push('Aggressive scanning may trigger security systems and generate significant traffic');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build nuclei command arguments
   */
  buildArgs(params: ToolParams): string[] {
    const args: string[] = [];

    // Targets (should be last)
    const targets = Array.isArray(params.targets) ? params.targets : [params.targets];

    // Silent mode (for JSON output)
    args.push('-silent');

    // JSONL output (not -json)
    args.push('-jsonl');

    // No color (for clean output)
    args.push('-no-color');

    // Severity filters
    if (params.severity) {
      let severityList: string[];
      if (Array.isArray(params.severity)) {
        severityList = params.severity;
      } else {
        severityList = params.severity.split(',').map((s: string) => s.trim().toLowerCase());
      }
      args.push('-severity', severityList.join(','));
    }

    // Templates
    if (params.templates && params.templates.length > 0) {
      args.push('-templates', params.templates.join(','));
    } else {
      // Use default templates if none specified
      const homeDir = process.env.HOME || '/home/ligong';
      args.push('-templates', `${homeDir}/nuclei-templates`);
    }

    // Template types
    if (params.templateTypes && params.templateTypes.length > 0) {
      args.push('-template-type', params.templateTypes.join(','));
    }

    // Exclude templates
    if (params.excludeTemplates && params.excludeTemplates.length > 0) {
      args.push('-exclude-templates', params.excludeTemplates.join(','));
    }

    // Workflow
    if (params.workflow) {
      args.push('-workflow', params.workflow);
    }

    // Severity (if not already added)
    if (params.severity && !args.includes('-severity')) {
      const severityList = Array.isArray(params.severity) ? params.severity : [params.severity];
      args.push('-severity', severityList.join(','));
    }

    // Rate limiting
    if (params.rateLimit) {
      args.push('-rate-limit', params.rateLimit.toString());
    }

    // Concurrency
    if (params.concurrency) {
      args.push('-c', params.concurrency.toString());
    }

    // Timeout
    if (params.timeout) {
      args.push('-timeout', params.timeout.toString());
    }

    // Retries
    if (params.retries) {
      args.push('-retries', params.retries.toString());
    }

    // User agent
    if (params.userAgent) {
      args.push('-user-agent', params.userAgent);
    }

    // Custom headers
    if (params.headers && Object.keys(params.headers).length > 0) {
      const headerPairs = Object.entries(params.headers)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      args.push('-header', headerPairs);
    }

    // HTTP proxy
    if (params.proxy) {
      args.push('-proxy', params.proxy);
    }

    // Exclude matchers
    if (params.excludeMatchers && params.excludeMatchers.length > 0) {
      args.push('-exclude-matchers', params.excludeMatchers.join(','));
    }

    // Bulk size
    if (params.bulkSize) {
      args.push('-bulk-size', params.bulkSize.toString());
    }

    // Bulk thread
    if (params.bulkThread) {
      args.push('-bulk-thread', params.bulkThread.toString());
    }

    // Follow redirects
    if (params.followRedirects) {
      args.push('-follow-redirects');
    }

    // Max redirects
    if (params.maxRedirects) {
      args.push('-max-redirects', params.maxRedirects.toString());
    }

    // Update templates
    if (params.updateTemplates) {
      args.push('-update-templates');
    }

    // Debug mode
    if (params.debug) {
      args.push('-debug');
    }

    // Verbose mode
    if (params.verbose) {
      args.push('-v');
    }

    // Note: -no-update flag removed as it's not supported in this version

    // Add targets
    args.push('-u', ...targets);

    return args;
  }

  /**
   * Parse nuclei output
   */
  parseOutput(stdout: string, stderr: string): any {
    const output: any = {
      raw: stdout,
      errors: stderr,
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        unknown: 0,
      },
    };

    // Parse JSON output lines
    const lines = stdout.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      try {
        const result = JSON.parse(line);

        // Extract vulnerability information
        const vuln = {
          template: result.template || result['template-id'] || 'unknown',
          templateID: result['template-id'] || 'unknown',
          info: result.info || {},
          type: result.type || 'unknown',
          host: result.host || result['matched-at'] || 'unknown',
          matchedAt: result['matched-at'] || 'unknown',
          severity: (result.info && result.info.severity) ? result.info.severity.toLowerCase() : 'unknown',
          request: result.request || null,
          response: result.response || null,
          curlCommand: result['curl-command'] || null,
          matcherStatus: result['matcher-status'] || null,
          extractedResults: result['extracted-results'] || [],
        };

        output.vulnerabilities.push(vuln);

        // Update summary
        output.summary.total++;
        const severity = vuln.severity.toLowerCase();
        if (severity in output.summary) {
          output.summary[severity]++;
        } else {
          output.summary.unknown++;
        }
      } catch (error) {
        // Skip invalid JSON lines
        if (line.trim().startsWith('{')) {
          output.errors += `\nFailed to parse JSON: ${line.substring(0, 100)}`;
        }
      }
    }

    output.parsed = output.vulnerabilities.length > 0;

    return output;
  }

  /**
   * Get input schema
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      targets: z.union([z.string(), z.array(z.string())]).describe('Target(s) to scan (URL, domain, or IP)'),
      severity: z.union([z.string(), z.array(z.string())]).optional().describe('Severity levels to include (critical, high, medium, low, info, unknown)'),
      templates: z.array(z.string()).optional().describe('List of templates or template paths to use'),
      templateTypes: z.array(z.string()).optional().describe('Template types to run (e.g., cve, exposures, misconfigurations)'),
      excludeTemplates: z.array(z.string()).optional().describe('Templates to exclude'),
      workflow: z.string().optional().describe('Workflow to execute'),
      rateLimit: z.number().optional().describe('Rate limit (requests per second)'),
      concurrency: z.number().optional().describe('Number of concurrent tasks'),
      timeout: z.number().optional().describe('Template timeout in seconds'),
      retries: z.number().optional().describe('Number of retries for failed requests'),
      userAgent: z.string().optional().describe('Custom user agent'),
      headers: z.record(z.string()).optional().describe('Custom headers'),
      proxy: z.string().optional().describe('HTTP proxy URL'),
      excludeMatchers: z.array(z.string()).optional().describe('Matchers to exclude'),
      bulkSize: z.number().optional().describe('Bulk size for analysis'),
      bulkThread: z.number().optional().describe('Number of threads for bulk analysis'),
      followRedirects: z.boolean().optional().describe('Follow HTTP redirects'),
      maxRedirects: z.number().optional().describe('Maximum number of redirects to follow'),
      updateTemplates: z.boolean().optional().describe('Update templates before scanning'),
      debug: z.boolean().optional().describe('Enable debug output'),
      verbose: z.boolean().optional().describe('Enable verbose output'),
    });
  }

  /**
   * Get common scan presets
   */
  static getPresets(): Record<string, any> {
    return {
      quick: {
        name: 'Quick Scan',
        description: 'Fast scan with critical and high severity templates',
        params: {
          severity: ['critical', 'high'],
          rateLimit: 150,
          concurrency: 25,
        },
      },
      comprehensive: {
        name: 'Comprehensive Scan',
        description: 'Thorough scan with all severity levels',
        params: {
          severity: ['critical', 'high', 'medium', 'low', 'info'],
          rateLimit: 100,
          concurrency: 25,
        },
      },
      cve: {
        name: 'CVE Scan',
        description: 'Scan for known CVE vulnerabilities',
        params: {
          templateTypes: ['cve'],
          severity: ['critical', 'high', 'medium'],
          rateLimit: 100,
        },
      },
      misconfigurations: {
        name: 'Misconfiguration Scan',
        description: 'Scan for security misconfigurations',
        params: {
          templateTypes: ['misconfigurations'],
          severity: ['critical', 'high', 'medium'],
          rateLimit: 150,
        },
      },
      stealthy: {
        name: 'Stealthy Scan',
        description: 'Slow scan to avoid detection',
        params: {
          severity: ['critical', 'high'],
          rateLimit: 10,
          concurrency: 2,
        },
      },
    };
  }
}
