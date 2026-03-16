import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import {
  isValidURL,
  isValidDomain,
  isValidIPv4,
  isValidIPv6,
} from '../validators/network.js';
import * as fs from 'fs';

/**
 * Kali built-in password dictionaries
 */
export const KALI_DICTIONARIES = {
  rockyou: {
    name: 'RockYou',
    path: '/usr/share/wordlists/rockyou.txt',
    compressedPath: '/usr/share/wordlists/rockyou.txt.gz',
    description: 'Most comprehensive password list (14M passwords, 143MB)',
    size: '143MB',
    passwordCount: 14344391,
  },
  john: {
    name: 'John the Ripper',
    path: '/usr/share/john/password.lst',
    description: 'Common passwords from Openwall Project (3,546 passwords)',
    size: '26KB',
    passwordCount: 3546,
  },
  fasttrack: {
    name: 'FastTrack',
    path: '/usr/share/set/src/fasttrack/wordlist.txt',
    description: 'Quick testing wordlist (hundreds of passwords)',
    size: '2.4KB',
    passwordCount: 500,
  },
  nmap: {
    name: 'Nmap Default',
    path: '/usr/share/nmap/nselib/data/passwords.lst',
    description: 'Service default credentials (5,000 passwords)',
    size: '40KB',
    passwordCount: 5000,
  },
  dnsmap: {
    name: 'DNS Map',
    path: '/usr/share/dnsmap/wordlist_TLAs.txt',
    description: 'Top Level Domains wordlist',
    size: '1KB',
    passwordCount: 200,
  },
  sqlmap: {
    name: 'SQLMap',
    path: '/usr/share/sqlmap/data/txt/wordlist.txt',
    description: 'SQL injection testing wordlist',
    size: '5KB',
    passwordCount: 1000,
  },
};

/**
 * Hydra tool wrapper for password cracking
 */
export class HydraTool extends BaseToolWrapper {
  name = 'hydra';
  description = 'Parallel login cracker supporting many different services (SSH, FTP, HTTP, etc.)';
  version = '1.0.0';

  /**
   * Validate hydra parameters
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
        // For hydra, we need IPs or domains
        if (!isValidURL(normalized) && !isValidDomain(normalized) &&
            !isValidIPv4(normalized) && !isValidIPv6(normalized)) {
          errors.push(`Invalid target: ${target}. Must be URL, IP address, or domain`);
        }
      }
    }

    // Validate service
    const validServices = [
      'ssh', 'ftp', 'http', 'https', 'http-get', 'http-post',
      'mysql', 'postgresql', 'telnet', 'vnc', 'rdp', 'smb',
      'pop3', 'imap', 'smtp', 'snmp', 'ldap', 'mongo', 'redis'
    ];

    if (params.service && !validServices.includes(params.service.toLowerCase())) {
      errors.push(`Invalid service: ${params.service}. Supported services: ${validServices.join(', ')}`);
    }

    if (!params.service) {
      warnings.push('No service specified. Defaulting to ssh. Specify service with "service" parameter.');
    }

    // Validate username options
    const usernameOptions = ['username', 'usernameFile', 'userAsPass'];
    const hasUsername = usernameOptions.some(opt => params[opt] === true || params[opt]);
    if (!hasUsername) {
      warnings.push('No username specified. Use "username", "usernameFile", or "userAsPass" parameter.');
    }

    // Validate password options
    const passwordOptions = ['password', 'passwordFile', 'passAsUser'];
    const hasPassword = passwordOptions.some(opt => params[opt] === true || params[opt]);
    if (!hasPassword) {
      warnings.push('No password specified. Use "password", "passwordFile", or "passAsUser" parameter.');
    }

    // Validate threads
    if (params.threads !== undefined) {
      const threads = parseInt(params.threads.toString(), 10);
      if (isNaN(threads) || threads < 1 || threads > 64) {
        errors.push('threads must be between 1 and 64');
      }
    }

    // Validate port
    if (params.port !== undefined) {
      const port = parseInt(params.port.toString(), 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push('port must be between 1 and 65535');
      }
    }

    // Warn about aggressive cracking
    if (params.threads && params.threads > 16) {
      warnings.push('High thread count may cause service instability or detection');
    }

    if (params.wait) {
      warnings.push('Wait delay will significantly slow down cracking');
    }

    // Validate and check built-in dictionaries
    if (params.passwordDictionary) {
      const dictName = params.passwordDictionary.toString().toLowerCase();
      const dict = Object.values(KALI_DICTIONARIES).find(d =>
        d.name.toLowerCase() === dictName ||
        d.path.toLowerCase() === dictName ||
        dictName === d.path.toLowerCase()
      );

      // Also try to find by key name
      const dictByKey = dict ? dict : KALI_DICTIONARIES[dictName as keyof typeof KALI_DICTIONARIES];

      if (dictByKey) {
        // Check if dictionary file exists
        const dictPath = dictByKey.path;
        if (fs.existsSync(dictPath)) {
          warnings.push(`Using Kali built-in dictionary: ${dictByKey.name} (${dictByKey.passwordCount} passwords, ${dictByKey.size})`);
        } else if ('compressedPath' in dictByKey) {
          const compressedPath = (dictByKey as any).compressedPath;
          if (compressedPath && fs.existsSync(compressedPath)) {
            warnings.push(`Dictionary ${dictByKey.name} is compressed. Extract with: gzip -dk ${compressedPath}`);
            errors.push(`Dictionary file not found: ${dictPath}. Please extract the compressed version first.`);
          } else {
            errors.push(`Kali dictionary not found: ${dictByKey.name}. Install kali-linux-default or check file paths.`);
          }
        } else {
          errors.push(`Kali dictionary not found: ${dictByKey.name}. Install kali-linux-default or check file paths.`);
        }
      } else {
        errors.push(`Unknown dictionary: ${params.passwordDictionary}. Available keys: ${Object.keys(KALI_DICTIONARIES).join(', ')}`);
      }
    }

    // Warn about wordlist sizes
    if (params.usernameFile || params.passwordFile) {
      warnings.push('Large wordlists can take a very long time. Consider starting with smaller lists.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build hydra command arguments
   */
  buildArgs(params: ToolParams): string[] {
    const args: string[] = [];

    // Targets
    const targets = Array.isArray(params.targets) ? params.targets : [params.targets];
    const target = targets[0]; // Hydra typically handles one target at a time

    // Service
    const service = params.service || 'ssh';

    // Username options
    if (params.username) {
      args.push('-l', params.username.toString());
    } else if (params.usernameFile) {
      args.push('-L', params.usernameFile.toString());
    } else if (params.userAsPass) {
      args.push('-e', 's'); // Try login as password
    }

    // Password options
    if (params.password) {
      args.push('-p', params.password.toString());
    } else if (params.passwordDictionary) {
      // Handle built-in Kali dictionaries
      const dictName = params.passwordDictionary.toString().toLowerCase();
      let dict = Object.values(KALI_DICTIONARIES).find(d =>
        d.name.toLowerCase() === dictName ||
        d.path.toLowerCase() === dictName ||
        dictName === d.path.toLowerCase()
      );

      // Also try to find by key name
      if (!dict) {
        dict = KALI_DICTIONARIES[dictName as keyof typeof KALI_DICTIONARIES];
      }

      if (dict && fs.existsSync(dict.path)) {
        args.push('-P', dict.path);
      } else {
        // If dictionary doesn't exist, use as-is (might be custom path)
        args.push('-P', params.passwordDictionary.toString());
      }
    } else if (params.passwordFile) {
      args.push('-P', params.passwordFile.toString());
    } else if (params.passAsUser) {
      args.push('-e', 'r'); // Try reversed login as password
    }

    // Additional options
    if (params.userAsPass && params.passAsUser) {
      args.push('-e', 'sr'); // Both options
    } else if (params.userAsPass) {
      args.push('-e', 's');
    } else if (params.passAsUser) {
      args.push('-e', 'r');
    }

    // Null password
    if (params.nullPassword) {
      args.push('-e', 'n');
    }

    // Threads
    if (params.threads) {
      args.push('-t', params.threads.toString());
    } else {
      args.push('-t', '4'); // Default
    }

    // Port
    if (params.port) {
      args.push('-s', params.port.toString());
    }

    // Wait/delay
    if (params.wait) {
      args.push('-w', params.wait.toString());
    }

    // Timeout
    if (params.timeout) {
      args.push('-W', params.timeout.toString());
    }

    // Output file
    if (params.outputFile) {
      args.push('-o', params.outputFile);
    }

    // SSL/TLS
    if (params.ssl) {
      args.push('-S');
    }

    // Exit after first found
    if (params.exitOnFound) {
      args.push('-f');
    }

    // Loop around users (more efficient)
    if (params.loopUsers) {
      args.push('-u');
    }

    // Restore session
    if (params.restoreSession) {
      args.push('-R');
    }

    // Verbose
    if (params.verbose) {
      args.push('-V');
    }

    // Debug
    if (params.debug) {
      args.push('-d');
    }

    // Target and service
    args.push(`${service}://${target}`);

    return args;
  }

  /**
   * Parse hydra output
   */
  parseOutput(stdout: string, stderr: string): any {
    const output: any = {
      raw: stdout,
      errors: stderr,
      credentials: [],
      summary: {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        duration: 0,
        servicesTested: 0,
      },
    };

    const lines = stdout.split('\n');

    for (const line of lines) {
      // Parse successful login
      if (line.includes('[') && line.includes(']')) {
        const successMatch = line.match(/\[(\d+)\/(\d+)\]\s+\[(\w+)\]\s+(\w+):\s+(\S+)/);
        if (successMatch) {
          output.credentials.push({
            attempt: successMatch[1],
            total: successMatch[2],
            host: successMatch[3],
            username: successMatch[4],
            password: successMatch[5],
          });
          output.summary.successfulAttempts++;
        }
      }

      // Parse Hydra header info
      if (line.includes('Hydra v')) {
        output.hydraVersion = line.match(/Hydra v([\d.]+)/)?.[1];
      }

      // Parse service information
      if (line.includes('service:') || line.includes('protocol:')) {
        output.serviceInfo = output.serviceInfo || {};
        const serviceMatch = line.match(/(\w+):\s+(\S+)/);
        if (serviceMatch) {
          output.serviceInfo[serviceMatch[1]] = serviceMatch[2];
        }
        output.summary.servicesTested++;
      }

      // Parse statistics
      if (line.includes('attempts:') || line.includes('time:')) {
        const statsMatch = line.match(/(\w+):\s+([\d\s]+)(\w*)/);
        if (statsMatch) {
          output.statistics = output.statistics || {};
          output.statistics[statsMatch[1]] = statsMatch[2].trim();
        }
      }

      // Parse progress updates
      if (line.match(/\[\d+\/\d+\]/)) {
        const progressMatch = line.match(/\[(\d+)\/(\d+)\]/);
        if (progressMatch) {
          output.summary.totalAttempts = parseInt(progressMatch[2], 10);
        }
      }

      // Parse errors
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
        output.errors += (output.errors ? '\n' : '') + line;
      }
    }

    output.summary.failedAttempts = output.summary.totalAttempts - output.summary.successfulAttempts;
    output.parsed = output.credentials.length > 0;

    return output;
  }

  /**
   * Get input schema
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      targets: z.union([z.string(), z.array(z.string())]).describe('Target server(s) (IP address, domain, or URL)'),
      service: z.string().optional().describe('Service to attack (ssh, ftp, http, https, mysql, etc.)'),
      username: z.string().optional().describe('Single username to test'),
      usernameFile: z.string().optional().describe('File containing usernames (one per line)'),
      password: z.string().optional().describe('Single password to test'),
      passwordFile: z.string().optional().describe('File containing passwords (one per line)'),
      passwordDictionary: z.string().optional().describe('Kali built-in dictionary name (rockyou, john, fasttrack, nmap, dnsmap, sqlmap)'),
      userAsPass: z.boolean().optional().describe('Try username as password'),
      passAsUser: z.boolean().optional().describe('Try reversed username as password'),
      nullPassword: z.boolean().optional().describe('Try empty password'),
      threads: z.number().min(1).max(64).optional().describe('Number of parallel connections (default: 4)'),
      port: z.number().min(1).max(65535).optional().describe('Port number (if not default for service)'),
      wait: z.number().optional().describe('Wait time between attempts in seconds'),
      timeout: z.number().optional().describe('Timeout for connections in seconds'),
      outputFile: z.string().optional().describe('Write found credentials to file'),
      ssl: z.boolean().optional().describe('Use SSL/TLS connection'),
      exitOnFound: z.boolean().optional().describe('Exit on first valid password found'),
      loopUsers: z.boolean().optional().describe('Loop around users instead of passwords (more efficient)'),
      restoreSession: z.boolean().optional().describe('Restore previous aborted session'),
      verbose: z.boolean().optional().describe('Verbose mode'),
      debug: z.boolean().optional().describe('Debug mode (show more info)'),
    });
  }

  /**
   * Get common attack presets
   */
  static getPresets(): Record<string, any> {
    return {
      quick: {
        name: 'Quick Test',
        description: 'Fast password test with common credentials',
        params: {
          threads: 4,
          timeout: 10,
        },
      },
      john: {
        name: 'John Dictionary Attack',
        description: 'Use Kali John the Ripper dictionary (3,546 passwords)',
        params: {
          passwordDictionary: 'john',
          threads: 4,
          timeout: 30,
          exitOnFound: true,
        },
      },
      rockyou: {
        name: 'RockYou Comprehensive Attack',
        description: 'Use Kali RockYou dictionary (14M passwords) - Most comprehensive',
        params: {
          passwordDictionary: 'rockyou',
          threads: 8,
          timeout: 120,
          exitOnFound: true,
        },
      },
      fasttrack: {
        name: 'FastTrack Quick Attack',
        description: 'Use Kali FastTrack dictionary (hundreds of passwords)',
        params: {
          passwordDictionary: 'fasttrack',
          threads: 4,
          timeout: 10,
          exitOnFound: true,
        },
      },
      nmap: {
        name: 'Nmap Default Credentials',
        description: 'Use Kali Nmap dictionary for service default passwords',
        params: {
          passwordDictionary: 'nmap',
          threads: 4,
          timeout: 30,
          exitOnFound: true,
        },
      },
      standard: {
        name: 'Standard Attack',
        description: 'Balanced attack with moderate resources',
        params: {
          passwordDictionary: 'john',
          threads: 8,
          timeout: 30,
          exitOnFound: true,
        },
      },
      aggressive: {
        name: 'Aggressive Attack',
        description: 'High-performance attack with RockYou dictionary',
        params: {
          passwordDictionary: 'rockyou',
          threads: 16,
          timeout: 120,
          exitOnFound: false,
        },
      },
      stealth: {
        name: 'Stealth Mode',
        description: 'Slow attack to avoid detection',
        params: {
          passwordDictionary: 'fasttrack',
          threads: 1,
          wait: 3,
          timeout: 60,
        },
      },
      web: {
        name: 'Web Form Attack',
        description: 'Attack HTTP/HTTPS login forms with John dictionary',
        params: {
          service: 'http-post',
          passwordDictionary: 'john',
          threads: 10,
          timeout: 30,
          exitOnFound: true,
        },
      },
    };
  }

  /**
   * Get available Kali dictionaries
   */
  static getKaliDictionaries(): Record<string, any> {
    return KALI_DICTIONARIES;
  }
}
