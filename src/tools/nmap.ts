import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import {
  isValidIPv4,
  isValidIPv6,
  isValidDomain,
  isValidCIDR,
  isValidPort,
  parseTargets,
} from '../validators/network.js';

/**
 * Nmap tool wrapper
 */
export class NmapTool extends BaseToolWrapper {
  name = 'nmap';
  description = 'Network mapper and port scanner for network discovery and security auditing';
  version = '1.0.0';

  /**
   * Validate nmap parameters
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
        if (!isValidIPv4(normalized) && !isValidIPv6(normalized) && !isValidDomain(normalized) && !isValidCIDR(normalized)) {
          errors.push(`Invalid target: ${target}`);
        }
      }
    }

    // Validate ports if specified
    if (params.ports !== undefined) {
      if (Array.isArray(params.ports)) {
        for (const port of params.ports) {
          if (!isValidPort(port)) {
            errors.push(`Invalid port: ${port}`);
          }
        }
      } else if (typeof params.ports === 'string') {
        // Validate port range (e.g., "1-1000")
        const portRange = params.ports.split('-');
        if (portRange.length === 2) {
          const start = parseInt(portRange[0], 10);
          const end = parseInt(portRange[1], 10);
          if (!isValidPort(start) || !isValidPort(end) || start > end) {
            errors.push(`Invalid port range: ${params.ports}`);
          }
        }
      }
    }

    // Validate timing
    if (params.timing !== undefined) {
      const timing = parseInt(params.timing, 10);
      if (isNaN(timing) || timing < 0 || timing > 5) {
        errors.push('timing must be between 0 and 5');
      }
    }

    // Warn about aggressive scans
    if (params.aggressive) {
      warnings.push('Aggressive scanning may trigger intrusion detection systems');
    }

    // Warn about script scans
    if (params.scripts && params.scripts.length > 0) {
      warnings.push('Script scanning may be detected and blocked');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build nmap command arguments
   */
  buildArgs(params: ToolParams): string[] {
    const args: string[] = [];

    // Targets (should be last)
    const targets = Array.isArray(params.targets) ? params.targets : [params.targets];
    const targetList = targets.map((t) => t.toLowerCase().trim()).join(' ');

    // Scan type
    if (params.scanType === 'tcpSyn') {
      args.push('-sS');
    } else if (params.scanType === 'tcpConnect') {
      args.push('-sT');
    } else if (params.scanType === 'udp') {
      args.push('-sU');
    } else if (params.scanType === 'ping') {
      args.push('-sn');
    }

    // Port specification
    if (params.ports) {
      if (Array.isArray(params.ports)) {
        args.push('-p', params.ports.join(','));
      } else {
        args.push('-p', params.ports.toString());
      }
    }

    // Service detection
    if (params.serviceDetection) {
      args.push('-sV');
      if (params.serviceIntensity) {
        args.push('--version-intensity', params.serviceIntensity.toString());
      }
    }

    // OS detection
    if (params.osDetection) {
      args.push('-O');
    }

    // Aggressive scan
    if (params.aggressive) {
      args.push('-A');
    }

    // Script scanning
    if (params.scripts && params.scripts.length > 0) {
      args.push('--script', params.scripts.join(','));
    }

    // Timing template
    if (params.timing !== undefined) {
      args.push(`-T${params.timing}`);
    }

    // Output format
    args.push('-oX', '-'); // XML output to stdout
    args.push('-oN', '-'); // Normal output to stdout

    // Verbosity
    if (params.verbose) {
      args.push('-v');
    }
    if (params.debug) {
      args.push('-vv');
    }

    // Min rate
    if (params.minRate) {
      args.push('--min-rate', params.minRate.toString());
    }

    // Max rate
    if (params.maxRate) {
      args.push('--max-rate', params.maxRate.toString());
    }

    // Add targets
    args.push(...targets);

    return args;
  }

  /**
   * Parse nmap output
   */
  parseOutput(stdout: string, stderr: string): any {
    const output: any = {
      raw: stdout,
      errors: stderr,
      hosts: [],
    };

    // Try to parse XML output (if present)
    const xmlMatch = stdout.match(/<\?xml.*?\?>[\s\S]*?<nmaprun/);
    if (xmlMatch) {
      try {
        // Simple XML parsing (for full XML parsing, consider using an XML library)
        const hosts: any[] = [];

        // Extract host information using regex
        const hostBlocks = stdout.match(/<host[\s\S]*?<\/host>/g) || [];
        for (const hostBlock of hostBlocks) {
          const host: any = {
            ip: '',
            hostnames: [],
            ports: [],
            os: [],
          };

          // Extract IP address
          const ipMatch = hostBlock.match(/<address addr="([^"]+)".*?addrtype="ipv4"/);
          if (ipMatch) {
            host.ip = ipMatch[1];
          }

          // Extract hostnames
          const hostnameMatches = hostBlock.matchAll(/<hostname name="([^"]+)"/g);
          for (const match of hostnameMatches) {
            host.hostnames.push(match[1]);
          }

          // Extract open ports
          const portMatches = hostBlock.matchAll(
            /<port protocol="([^"]+)" portid="(\d+)"><state state="([^"]+)"/g
          );
          for (const match of portMatches) {
            if (match[3] === 'open') {
              host.ports.push({
                protocol: match[1],
                port: parseInt(match[2], 10),
                state: match[3],
              });
            }
          }

          // Extract OS matches
          const osMatches = hostBlock.matchAll(/<osmatch name="([^"]+)"/g);
          for (const match of osMatches) {
            host.os.push(match[1]);
          }

          if (host.ip || host.hostnames.length > 0) {
            output.hosts.push(host);
          }
        }

        output.parsed = true;
      } catch (error) {
        output.parseError = error instanceof Error ? error.message : 'Unknown parse error';
      }
    }

    // Extract summary information
    const statsMatch = stdout.match(/Nmap done:.*?(\d+) IP address.*?up in/i);
    if (statsMatch) {
      output.stats = {
        hostsUp: parseInt(statsMatch[1], 10),
      };
    }

    return output;
  }

  /**
   * Get input schema
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      targets: z.union([z.string(), z.array(z.string())]).describe('Target(s) to scan (IP, domain, or hostname)'),
      scanType: z.enum(['tcpSyn', 'tcpConnect', 'udp', 'ping']).optional().describe('Type of scan to perform'),
      ports: z.union([z.array(z.number()), z.string()]).optional().describe('Ports or port ranges to scan'),
      serviceDetection: z.boolean().optional().describe('Enable service version detection'),
      serviceIntensity: z.number().min(0).max(9).optional().describe('Service version intensity (0-9)'),
      osDetection: z.boolean().optional().describe('Enable OS detection'),
      aggressive: z.boolean().optional().describe('Enable aggressive scan options'),
      scripts: z.array(z.string()).optional().describe('List of NSE scripts to run'),
      timing: z.number().min(0).max(5).optional().describe('Timing template (0-5, higher is faster)'),
      verbose: z.boolean().optional().describe('Enable verbose output'),
      debug: z.boolean().optional().describe('Enable debug output'),
      minRate: z.number().optional().describe('Minimum packets per second'),
      maxRate: z.number().optional().describe('Maximum packets per second'),
      timeout: z.number().optional().describe('Timeout in seconds'),
    });
  }

  /**
   * Get common scan presets
   */
  static getPresets(): Record<string, any> {
    return {
      quick: {
        name: 'Quick Scan',
        description: 'Fast scan of common ports',
        params: {
          ports: '1-1000',
          timing: 4,
          serviceDetection: true,
        },
      },
      comprehensive: {
        name: 'Comprehensive Scan',
        description: 'Thorough scan with service detection',
        params: {
          ports: '1-65535',
          timing: 3,
          serviceDetection: true,
          osDetection: true,
        },
      },
      stealthy: {
        name: 'Stealthy Scan',
        description: 'Slow scan to avoid detection',
        params: {
          scanType: 'tcpSyn',
          ports: '1-1000',
          timing: 1,
        },
      },
      aggressive: {
        name: 'Aggressive Scan',
        description: 'Fast scan with OS detection',
        params: {
          aggressive: true,
          timing: 4,
        },
      },
    };
  }
}
