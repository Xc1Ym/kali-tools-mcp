import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import {
  isValidURL,
  isValidDomain,
  isValidIPv4,
  isValidIPv6,
} from '../validators/network.js';

/**
 * Sqlmap tool wrapper for SQL injection testing
 */
export class SqlmapTool extends BaseToolWrapper {
  name = 'sqlmap';
  description = 'Automatic SQL injection and database takeover tool';
  version = '1.0.0';

  /**
   * Validate sqlmap parameters
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
        // For sqlmap, we need URLs with parameters
        if (!isValidURL(normalized) && !isValidDomain(normalized)) {
          errors.push(`Invalid target: ${target}. Must be URL with parameters (e.g., http://example.com/page?id=1)`);
        }

        // Check if URL has parameters
        if (isValidURL(normalized) && !normalized.includes('?')) {
          warnings.push(`Target ${target} has no parameters. SQL injection testing requires URL parameters.`);
        }
      }
    }

    // Validate level
    if (params.level !== undefined) {
      const level = parseInt(params.level.toString(), 10);
      if (isNaN(level) || level < 1 || level > 5) {
        errors.push('level must be between 1 and 5');
      }
    }

    // Validate risk
    if (params.risk !== undefined) {
      const risk = parseInt(params.risk.toString(), 10);
      if (isNaN(risk) || risk < 1 || risk > 3) {
        errors.push('risk must be between 1 and 3');
      }
    }

    // Validate threads
    if (params.threads !== undefined) {
      const threads = parseInt(params.threads.toString(), 10);
      if (isNaN(threads) || threads < 1 || threads > 10) {
        errors.push('threads must be between 1 and 10');
      }
    }

    // Warn about aggressive options
    if (params.level && params.level > 3) {
      warnings.push('High level testing may cause significant database load');
    }

    if (params.risk && params.risk > 2) {
      warnings.push('High risk tests may include dangerous SQL injection payloads');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build sqlmap command arguments
   */
  buildArgs(params: ToolParams): string[] {
    const args: string[] = [];

    // Batch mode (non-interactive)
    args.push('--batch');

    // Targets
    const targets = Array.isArray(params.targets) ? params.targets : [params.targets];

    // URL target
    if (targets.length === 1) {
      args.push('-u', targets[0]);
    } else {
      // Multiple targets - use request file or list
      args.push('-m', targets.join(','));
    }

    // Level (depth of testing)
    if (params.level) {
      args.push('--level', params.level.toString());
    }

    // Risk (payload risk)
    if (params.risk) {
      args.push('--risk', params.risk.toString());
    }

    // Threads
    if (params.threads) {
      args.push('--threads', params.threads.toString());
    } else {
      args.push('--threads', '5'); // Default
    }

    // Database type
    if (params.dbms) {
      args.push('--dbms', params.dbms);
    }

    // OS type
    if (params.os) {
      args.push('--os', params.os);
    }

    // Test specific parameter
    if (params.parameter) {
      args.push('-p', params.parameter);
    }

    // Skip parameter
    if (params.skip) {
      args.push('--skip', params.skip);
    }

    // Cookie
    if (params.cookie) {
      args.push('--cookie', params.cookie);
    }

    // User agent
    if (params.userAgent) {
      args.push('--user-agent', params.userAgent);
    }

    // Random agent
    if (params.randomAgent) {
      args.push('--random-agent');
    }

    // Headers
    if (params.headers && Object.keys(params.headers).length > 0) {
      const headerPairs = Object.entries(params.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(';;');
      args.push('--headers', headerPairs);
    }

    // Proxy
    if (params.proxy) {
      args.push('--proxy', params.proxy);
    }

    // Delay
    if (params.delay) {
      args.push('--delay', params.delay.toString());
    }

    // Timeout
    if (params.timeout) {
      args.push('--timeout', params.timeout.toString());
    }

    // Retry
    if (params.retry) {
      args.push('--retries', params.retry.toString());
    }

    // Technique (SQL injection technique)
    if (params.technique) {
      args.push('--technique', params.technique);
    }

    // Union test
    if (params.unionTest) {
      args.push('--union-test');
    }

    // Union columns
    if (params.unionCols) {
      args.push('--union-cols', params.unionCols.toString());
    }

    // Database enumeration
    if (params.dbs) {
      args.push('--dbs');
    }

    // Tables enumeration
    if (params.tables) {
      args.push('--tables');
    }

    // Columns enumeration
    if (params.columns) {
      args.push('--columns');
    }

    // Dump data
    if (params.dump) {
      args.push('--dump');
    }

    // Dump all
    if (params.dumpAll) {
      args.push('--dump-all');
    }

    // Schema
    if (params.schema) {
      args.push('--schema');
    }

    // Current user
    if (params.currentUser) {
      args.push('--current-user');
    }

    // Current database
    if (params.currentDb) {
      args.push('--current-db');
    }

    // Hostname
    if (params.hostname) {
      args.push('--hostname');
    }

    // Is dba
    if (params.isDba) {
      args.push('--is-dba');
    }

    // Passwords
    if (params.passwords) {
      args.push('--passwords');
    }

    // Users
    if (params.users) {
      args.push('--users');
    }

    // Roles
    if (params.roles) {
      args.push('--roles');
    }

    // Privileges
    if (params.privileges) {
      args.push('--privileges');
    }

    // Check WAF
    if (params.checkWaf) {
      args.push('--check-waf');
    }

    // Identify WAF
    if (params.identifyWaf) {
      args.push('--identify-waf');
    }

    // Mobile
    if (params.mobile) {
      args.push('--mobile');
    }

    // Crawl
    if (params.crawl) {
      args.push('--crawl', params.crawl.toString());
    }

    // Parse forms
    if (params.forms) {
      args.push('--forms');
    }

    // Answer query
    if (params.answerQuery) {
      args.push('--answers', params.answerQuery);
    }

    // Batch output
    if (params.batchOutput) {
      args.push('--batch-output');
    }

    // Be quiet
    if (params.quiet) {
      args.push('--quiet');
    }

    // Verbose
    if (params.verbose) {
      args.push('-v');
    }

    return args;
  }

  /**
   * Parse sqlmap output
   */
  parseOutput(stdout: string, stderr: string): any {
    const output: any = {
      raw: stdout,
      errors: stderr,
      vulnerabilities: [],
      databases: [],
      tables: [],
      columns: [],
      data: [],
      summary: {
        totalVulnerabilities: 0,
        injectableParameters: 0,
        databasesFound: 0,
        tablesFound: 0,
        duration: 0,
      },
    };

    const lines = stdout.split('\n');

    for (const line of lines) {
      // Parse injectable parameters
      if (line.includes('Parameter:') && line.includes('appears to be vulnerable')) {
        const paramMatch = line.match(/Parameter:\s+(\S+)\s+\((\S+)\)\s+appears to be vulnerable/);
        if (paramMatch) {
          output.vulnerabilities.push({
            parameter: paramMatch[1],
            type: paramMatch[2],
            injectable: true,
          });
          output.summary.injectableParameters++;
        }
      }

      // Parse SQL injection type
      if (line.includes('Type:') && line.includes('Payload:')) {
        const typeMatch = line.match(/Type:\s+(.+?)\s+Payload:/);
        if (typeMatch) {
          const lastVuln = output.vulnerabilities[output.vulnerabilities.length - 1];
          if (lastVuln) {
            lastVuln.sqlInjectionType = typeMatch[1].trim();
          }
        }
      }

      // Parse databases
      if (line.includes('available databases') || line.includes('Database:')) {
        const dbMatch = line.match(/\*\s+(.+)/);
        if (dbMatch) {
          const dbName = dbMatch[1].trim();
          if (!output.databases.includes(dbName) && dbName.length > 0) {
            output.databases.push(dbName);
            output.summary.databasesFound++;
          }
        }
      }

      // Parse tables
      if (line.includes('Database:') && line.includes('Table:')) {
        const tableMatch = line.match(/Database:\s+(\S+)\s+\[\d+\ tables\]\s+\Table:\s+(\S+)/);
        if (tableMatch) {
          output.tables.push({
            database: tableMatch[1],
            table: tableMatch[2],
          });
          output.summary.tablesFound++;
        }
      }

      // Parse columns
      if (line.includes('Column:') && line.includes('Type:')) {
        const columnMatch = line.match(/Column:\s+(\S+)\s+Type:\s+(\S+)/);
        if (columnMatch) {
          output.columns.push({
            column: columnMatch[1],
            type: columnMatch[2],
          });
        }
      }

      // Parse current user
      if (line.includes('current user') || line.includes('current database user')) {
        const userMatch = line.match(/current (?:database )?user(?: is)?:\s+['"]?([^'"\s]+)/);
        if (userMatch) {
          output.currentUser = userMatch[1].trim();
        }
      }

      // Parse current database
      if (line.includes('current database') || line.includes('current DB')) {
        const dbMatch = line.match(/current (?:database|DB)(?: is)?:\s+['"]?([^'"\s]+)/);
        if (dbMatch) {
          output.currentDatabase = dbMatch[1].trim();
        }
      }

      // Parse DBA status
      if (line.includes('current user is DBA') || line.includes('is DBA')) {
        const dbaMatch = line.match(/(?:current user|he)\s+(?:is)?\s+(?:a)?\s*DBA(?:\s+[^:]*)?:\s+([^:\s]+)/);
        if (dbaMatch) {
          output.isDba = true;
          output.dbaMessage = dbaMatch[1].trim();
        }
      }

      // Parse hostname
      if (line.includes('hostname:') || line.includes('remote host')) {
        const hostMatch = line.match(/hostname:\s+([^:\s]+)/);
        if (hostMatch) {
          output.hostname = hostMatch[1].trim();
        }
      }

      // Parse web application technology
      if (line.includes('web application technology') || line.includes('back-end DBMS')) {
        const techMatch = line.match(/(?:web application technology|back-end DBMS):\s+([^:\n]+)/);
        if (techMatch) {
          output.technology = techMatch[1].trim();
        }
      }

      // Parse WAF detection
      if (line.includes('WAF/IPS') || line.includes('web application firewall')) {
        const wafMatch = line.match(/WAF\/IPS[^\n]*?[:]\s+([^\n]+)/);
        if (wafMatch) {
          output.wafDetected = true;
          output.wafType = wafMatch[1].trim();
        }
      }
    }

    output.summary.totalVulnerabilities = output.vulnerabilities.length;
    output.parsed = output.vulnerabilities.length > 0 || output.databases.length > 0;

    return output;
  }

  /**
   * Get input schema
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      targets: z.union([z.string(), z.array(z.string())]).describe('Target URL(s) with parameters (http://example.com/page?id=1)'),
      level: z.number().min(1).max(5).optional().describe('Testing level (1-5, higher = more tests)'),
      risk: z.number().min(1).max(3).optional().describe('Risk level (1-3, higher = more risky payloads)'),
      threads: z.number().min(1).max(10).optional().describe('Number of threads (default: 5)'),
      dbms: z.string().optional().describe('Force back-end DBMS (MySQL, PostgreSQL, etc.)'),
      os: z.string().optional().describe('Force back-end OS (Linux, Windows, etc.)'),
      parameter: z.string().optional().describe('Test specific parameter'),
      skip: z.string().optional().describe('Skip testing specific parameter'),
      cookie: z.string().optional().describe('HTTP Cookie header value'),
      userAgent: z.string().optional().describe('HTTP User-Agent header value'),
      randomAgent: z.boolean().optional().describe('Use randomly selected HTTP User-Agent header value'),
      headers: z.record(z.string()).optional().describe('Extra HTTP headers'),
      proxy: z.string().optional().describe('HTTP proxy address'),
      delay: z.number().optional().describe('Delay in seconds between each HTTP request'),
      timeout: z.number().optional().describe('Seconds to wait before timeout connection'),
      retry: z.number().optional().describe('Maximum number of retries when connection timeout'),
      technique: z.string().optional().describe('SQL injection technique (BEUSTQ)'),
      unionTest: z.boolean().optional().describe('Test for UNION query SQL injection'),
      unionCols: z.number().optional().describe('Number of columns for UNION query SQL injection'),
      dbs: z.boolean().optional().describe('Enumerate DBMS databases'),
      tables: z.boolean().optional().describe('Enumerate DBMS database tables'),
      columns: z.boolean().optional().describe('Enumerate DBMS database table columns'),
      dump: z.boolean().optional().describe('Dump DBMS database table entries'),
      dumpAll: z.boolean().optional().describe('Dump all DBMS databases tables entries'),
      schema: z.boolean().optional().describe('Enumerate DBMS schema'),
      currentUser: z.boolean().optional().describe('Enumerate DBMS current user'),
      currentDb: z.boolean().optional().describe('Enumerate DBMS current database'),
      hostname: z.boolean().optional().describe('Enumerate DBMS server hostname'),
      isDba: z.boolean().optional().describe('Detect if current DBMS user is DBA'),
      passwords: z.boolean().optional().describe('Enumerate DBMS users password hashes'),
      users: z.boolean().optional().describe('Enumerate DBMS users'),
      roles: z.boolean().optional().describe('Enumerate DBMS users roles'),
      privileges: z.boolean().optional().describe('Enumerate DBMS users privileges'),
      checkWaf: z.boolean().optional().describe('Check for WAF/IPS/IDS protection'),
      identifyWaf: z.boolean().optional().describe('Identify WAF/IPS/IDS protection'),
      mobile: z.boolean().optional().describe('Imitate mobile device through HTTP User-Agent header'),
      crawl: z.number().optional().describe('Crawl the website starting from the target URL'),
      forms: z.boolean().optional().describe('Parse and test forms in target URL'),
      answerQuery: z.string().optional().describe('Answer to SQL injection question'),
      batchOutput: z.boolean().optional().describe('Ask for user input in batch mode'),
      quiet: z.boolean().optional().describe('Quiet mode (less output)'),
      verbose: z.boolean().optional().describe('Verbose mode (more output)'),
    });
  }

  /**
   * Get common scan presets
   */
  static getPresets(): Record<string, any> {
    return {
      quick: {
        name: 'Quick Scan',
        description: 'Fast SQL injection test with basic tests',
        params: {
          level: 1,
          risk: 1,
          threads: 5,
        },
      },
      comprehensive: {
        name: 'Comprehensive Scan',
        description: 'Thorough SQL injection testing',
        params: {
          level: 3,
          risk: 2,
          threads: 5,
        },
      },
      aggressive: {
        name: 'Aggressive Scan',
        description: 'Maximum testing coverage',
        params: {
          level: 5,
          risk: 3,
          threads: 10,
        },
      },
      enumeration: {
        name: 'Database Enumeration',
        description: 'Enumerate databases, tables, and columns',
        params: {
          level: 2,
          risk: 1,
          threads: 5,
          dbs: true,
          tables: true,
          columns: true,
        },
      },
      dataExtraction: {
        name: 'Data Extraction',
        description: 'Extract data from vulnerable parameters',
        params: {
          level: 3,
          risk: 2,
          threads: 5,
          dump: true,
        },
      },
    };
  }
}
