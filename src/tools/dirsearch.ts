import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import {
  isValidURL,
  isValidDomain,
  isValidIPv4,
  isValidIPv6,
  normalizeTarget,
} from '../validators/network.js';

/**
 * Dirsearch tool wrapper for directory/path scanning
 */
export class DirsearchTool extends BaseToolWrapper {
  name = 'dirsearch';
  description = 'Web path scanner and directory enumeration tool';
  version = '1.0.0';

  /**
   * Validate dirsearch parameters
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
        // For dirsearch, we need URLs or domains
        if (!isValidURL(normalized) && !isValidDomain(normalized) &&
            !isValidIPv4(normalized) && !isValidIPv6(normalized)) {
          errors.push(`Invalid target: ${target}. Must be URL, domain, or IP`);
        }
      }
    }

    // Validate extensions if specified
    if (params.extensions && params.extensions.length > 0) {
      for (const ext of params.extensions) {
        if (typeof ext !== 'string' || ext.trim().length === 0) {
          errors.push(`Invalid extension: ${ext}`);
        }
      }
    }

    // Validate thread count
    if (params.threads !== undefined) {
      const threads = parseInt(params.threads.toString(), 10);
      if (isNaN(threads) || threads < 1 || threads > 50) {
        errors.push('threads must be between 1 and 50');
      }
    }

    // Validate depth
    if (params.depth !== undefined) {
      const depth = parseInt(params.depth.toString(), 10);
      if (isNaN(depth) || depth < 1 || depth > 10) {
        errors.push('depth must be between 1 and 10');
      }
    }

    // Warn about aggressive scanning
    if (params.threads && params.threads > 20) {
      warnings.push('High thread count may trigger security systems');
    }

    if (params.recursive && params.depth && params.depth > 3) {
      warnings.push('Deep recursive scanning may take a long time');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build dirsearch command arguments
   */
  buildArgs(params: ToolParams): string[] {
    const args: string[] = [];

    // Targets
    const targets = Array.isArray(params.targets) ? params.targets : [params.targets];

    // URL(s)
    for (const target of targets) {
      args.push('-u', target);
    }

    // Extensions
    if (params.extensions && params.extensions.length > 0) {
      const extList = Array.isArray(params.extensions) ? params.extensions : [params.extensions];
      args.push('-e', extList.join(','));
    } else {
      // Default extensions for web scanning
      args.push('-e', 'php,html,js,txt');
    }

    // Thread count
    if (params.threads) {
      args.push('--threads', params.threads.toString());
    } else {
      args.push('--threads', '10'); // Default
    }

    // Wordlist
    if (params.wordlist) {
      args.push('-w', params.wordlist);
    }

    // Recursive scanning
    if (params.recursive) {
      args.push('-r');
    }

    // Depth level
    if (params.depth) {
      args.push('--max-recursion-depth', params.depth.toString());
    }

    // HTTP method
    if (params.method) {
      args.push('-x', params.method.toString());
    }

    // User agent
    if (params.userAgent) {
      args.push('--user-agent', params.userAgent);
    }

    // Cookies
    if (params.cookies) {
      args.push('--cookie', params.cookies);
    }

    // Headers
    if (params.headers && Object.keys(params.headers).length > 0) {
      const headerPairs = Object.entries(params.headers)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      args.push('--header', headerPairs);
    }

    // Proxy
    if (params.proxy) {
      args.push('--proxy', params.proxy);
    }

    // Timeout
    if (params.timeout) {
      args.push('--timeout', params.timeout.toString());
    }

    // IP resolution
    if (params.ip) {
      args.push('--ip', params.ip);
    }

    // Random user agent
    if (params.randomAgent) {
      args.push('--random-agent');
    }

    // Exclude extensions
    if (params.excludeExtensions && params.excludeExtensions.length > 0) {
      args.push('--exclude-extensions', params.excludeExtensions.join(','));
    }

    // Exclude status codes
    if (params.excludeStatusCodes) {
      const codes = Array.isArray(params.excludeStatusCodes)
        ? params.excludeStatusCodes
        : [params.excludeStatusCodes];
      args.push('--exclude-status', codes.join(','));
    }

    // Include status codes
    if (params.includeStatusCodes) {
      const codes = Array.isArray(params.includeStatusCodes)
        ? params.includeStatusCodes
        : [params.includeStatusCodes];
      args.push('--include-status', codes.join(','));
    }

    // Minimal response size
    if (params.minSize) {
      args.push('--min-response-size', params.minSize.toString());
    }

    // Maximal response size
    if (params.maxSize) {
      args.push('--max-response-size', params.maxSize.toString());
    }

    // Quiet mode (less output)
    if (params.quiet) {
      args.push('--quiet');
    }

    // No color output
    args.push('--no-color');

    return args;
  }

  /**
   * Parse dirsearch output
   */
  parseOutput(stdout: string, stderr: string): any {
    const output: any = {
      raw: stdout,
      errors: stderr,
      directories: [],
      files: [],
      summary: {
        totalFound: 0,
        scanned: 0,
        errors: 0,
        duration: 0,
      },
    };

    const lines = stdout.split('\n');
    let inProgress = false;

    for (const line of lines) {
      // Parse progress line
      if (line.includes('Progress:')) {
        const progressMatch = line.match(/Progress:\s+(\d+)\/\s*(\d+)/);
        if (progressMatch) {
          output.summary.scanned = parseInt(progressMatch[2], 10);
        }
        continue;
      }

      // Parse found paths
      if (line.includes('[+]') && line.includes('http')) {
        const pathMatch = line.match(/\[\d{2}:\d{2}:\d{2}\]\s+\[\+\]\s+(.+?)\s+\((\d{3})\)\s+-\s+(.+)/);
        if (pathMatch) {
          const path = pathMatch[1].trim();
          const status = parseInt(pathMatch[2], 10);
          const size = pathMatch[3].trim();

          const item = {
            path,
            status,
            size,
            type: status === 200 ? 'Found' : 'Redirect',
          };

          output.directories.push(item);
          output.summary.totalFound++;
        }
      }

      // Parse file lines
      if (line.includes('Size:') && line.includes('URL:')) {
        const urlMatch = line.match(/URL:\s+(.+?)\s+\|\s+Status:\s+(\d+)\s+\|\s+Size:\s+(.+)/);
        if (urlMatch) {
          const path = urlMatch[1].trim();
          const status = parseInt(urlMatch[2], 10);
          const size = urlMatch[3].trim();

          const item = {
            path,
            status,
            size,
            type: 'File',
          };

          output.files.push(item);
          output.summary.totalFound++;
        }
      }

      // Parse task duration
      if (line.includes('Task:')) {
        const durationMatch = line.match(/Task:\s+(\d+)\s+seconds/);
        if (durationMatch) {
          output.summary.duration = parseInt(durationMatch[1], 10);
        }
      }
    }

    output.parsed = output.directories.length > 0 || output.files.length > 0;

    return output;
  }

  /**
   * Get input schema
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      targets: z.union([z.string(), z.array(z.string())]).describe('Target URL(s) to scan (http://example.com)'),
      extensions: z.union([z.string(), z.array(z.string())]).optional().describe('File extensions to scan for (php,html,js,txt)'),
      wordlist: z.string().optional().describe('Path to custom wordlist'),
      threads: z.number().min(1).max(50).optional().describe('Number of threads (default: 10)'),
      recursive: z.boolean().optional().describe('Enable recursive scanning'),
      depth: z.number().min(1).max(10).optional().describe('Maximum recursion depth (default: 2)'),
      method: z.string().optional().describe('HTTP method to use (GET, POST, etc.)'),
      userAgent: z.string().optional().describe('Custom user agent'),
      cookies: z.string().optional().describe('Cookies to send with requests'),
      headers: z.record(z.string()).optional().describe('Custom HTTP headers'),
      proxy: z.string().optional().describe('Proxy URL'),
      timeout: z.number().optional().describe('Request timeout in seconds'),
      ip: z.string().optional().describe('Custom IP resolution'),
      randomAgent: z.boolean().optional().describe('Use random user agent'),
      excludeExtensions: z.array(z.string()).optional().describe('Extensions to exclude'),
      excludeStatusCodes: z.union([z.array(z.number()), z.number()]).optional().describe('Status codes to exclude'),
      includeStatusCodes: z.union([z.array(z.number()), z.number()]).optional().describe('Status codes to include'),
      minSize: z.number().optional().describe('Minimum response size'),
      maxSize: z.number().optional().describe('Maximum response size'),
      quiet: z.boolean().optional().describe('Quiet mode (less output)'),
    });
  }

  /**
   * Get common scan presets
   */
  static getPresets(): Record<string, any> {
    return {
      quick: {
        name: 'Quick Scan',
        description: 'Fast scan with common extensions',
        params: {
          extensions: ['php', 'html', 'js', 'txt'],
          threads: 15,
          recursive: false,
        },
      },
      comprehensive: {
        name: 'Comprehensive Scan',
        description: 'Thorough scan with recursive searching',
        params: {
          extensions: ['php', 'html', 'js', 'txt', 'json', 'xml', 'zip', 'bak', 'old'],
          threads: 10,
          recursive: true,
          depth: 3,
        },
      },
      php: {
        name: 'PHP Applications',
        description: 'Focus on PHP files and backups',
        params: {
          extensions: ['php', 'php3', 'php4', 'php5', 'phtml', 'inc', 'bak', 'old'],
          threads: 10,
          recursive: true,
          depth: 2,
        },
      },
      stealthy: {
        name: 'Stealthy Scan',
        description: 'Slow scan to avoid detection',
        params: {
          extensions: ['php', 'html', 'js', 'txt'],
          threads: 3,
          recursive: false,
          randomAgent: true,
        },
      },
      backup: {
        name: 'Backup Files',
        description: 'Search for backup and hidden files',
        params: {
          extensions: ['bak', 'old', 'backup', 'zip', 'tar', 'gz', 'sql', 'conf', 'config'],
          threads: 10,
          recursive: false,
        },
      },
    };
  }
}
