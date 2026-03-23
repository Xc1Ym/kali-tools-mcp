/**
 * Acunetix MCP Tool Wrapper
 * Main tool wrapper for Acunetix integration
 */

import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import { AcunetixClient, AcunetixConfig } from './acunetix/client.js';
import { AcunetixTargetsTool } from './acunetix/targets.js';
import { AcunetixScansTool } from './acunetix/scans.js';
import { AcunetixVulnerabilitiesTool } from './acunetix/vulnerabilities.js';
import { AcunetixReportsTool } from './acunetix/reports.js';
import { loadConfig } from '../utils/security.js';

/**
 * Acunetix configuration structure
 */
interface AcunetixToolConfig {
  apiBaseUrl: string;
  apiKey: string;
  timeout?: number;
  rejectUnauthorized?: boolean;
}

/**
 * Acunetix Tool Wrapper
 * Provides access to all Acunetix functionality
 */
export class AcunetixTool extends BaseToolWrapper {
  name = 'acunetix';
  description = 'Acunetix vulnerability scanner integration - manage targets, scans, vulnerabilities, and reports';
  version = '1.0.0';

  private client: AcunetixClient | null = null;
  private targets: AcunetixTargetsTool | null = null;
  private scans: AcunetixScansTool | null = null;
  private vulnerabilities: AcunetixVulnerabilitiesTool | null = null;
  private reports: AcunetixReportsTool | null = null;

  /**
   * Initialize Acunetix client
   */
  private async initializeClient(): Promise<boolean> {
    if (this.client) {
      return true;
    }

    try {
      const config = await loadConfig();

      // Get Acunetix configuration from config file or environment
      const acunetixConfig: AcunetixToolConfig = {
        apiBaseUrl: process.env.ACUNETIX_API_URL || config.acunetix?.apiBaseUrl || 'https://127.0.0.1:3443/api/v1',
        apiKey: process.env.ACUNETIX_API_KEY || config.acunetix?.apiKey || '',
        timeout: config.acunetix?.timeout || 30000,
        rejectUnauthorized: config.acunetix?.rejectUnauthorized ?? false,
      };

      if (!acunetixConfig.apiKey) {
        throw new Error('Acunetix API key is not configured. Set ACUNETIX_API_KEY environment variable or add acunetix.apiKey to config.');
      }

      this.client = new AcunetixClient(acunetixConfig);
      this.targets = new AcunetixTargetsTool(this.client);
      this.scans = new AcunetixScansTool(this.client);
      this.vulnerabilities = new AcunetixVulnerabilitiesTool(this.client);
      this.reports = new AcunetixReportsTool(this.client);

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize Acunetix client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate parameters
   */
  validateParams(params: ToolParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate action parameter
    if (!params.action) {
      errors.push('action parameter is required');
    } else {
      const validActions = [
        'list_targets', 'get_target', 'create_target', 'update_target', 'delete_target',
        'list_scans', 'get_scan', 'create_scan', 'start_scan', 'abort_scan', 'resume_scan',
        'list_vulnerabilities', 'get_vulnerability', 'update_vuln_status', 'recheck_vuln',
        'list_reports', 'get_report', 'create_report', 'delete_report', 'download_report',
        'get_templates', 'test_connection'
      ];

      if (!validActions.includes(params.action)) {
        errors.push(`Invalid action: ${params.action}. Valid actions: ${validActions.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build arguments (not used for API-based tool)
   */
  buildArgs(params: ToolParams): string[] {
    return [];
  }

  /**
   * Parse output
   */
  parseOutput(stdout: string, stderr: string): any {
    return {
      stdout,
      stderr,
    };
  }

  /**
   * Check if Acunetix is available
   */
  async checkAvailable(): Promise<boolean> {
    try {
      await this.initializeClient();
      if (this.client) {
        return await this.client.testConnection();
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Execute the tool
   */
  async execute(params: ToolParams): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Initialize client
      const initialized = await this.initializeClient();
      if (!initialized || !this.client || !this.targets || !this.scans || !this.vulnerabilities || !this.reports) {
        return {
          success: false,
          data: null,
          error: 'Failed to initialize Acunetix client',
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

      const action = params.action;
      let result: any;

      // Route to appropriate handler
      switch (action) {
        // Target operations
        case 'list_targets':
          result = await this.targets.listTargets(params);
          break;
        case 'get_target':
          result = await this.targets.getTarget(params.target_id);
          break;
        case 'create_target':
          result = await this.targets.createTarget({
            address: params.address,
            description: params.description,
            type: params.type,
            criticality: params.criticality,
          });
          break;
        case 'update_target':
          result = await this.targets.updateTarget(params.target_id, {
            description: params.description,
            criticality: params.criticality,
          });
          break;
        case 'delete_target':
          result = await this.targets.deleteTarget(params.target_id);
          break;

        // Scan operations
        case 'list_scans':
          result = await this.scans.listScans(params);
          break;
        case 'get_scan':
          result = await this.scans.getScan(params.scan_id);
          break;
        case 'create_scan':
          result = await this.scans.createScan({
            target_id: params.target_id,
            profile_id: params.profile_id,
          });
          break;
        case 'start_scan':
          result = await this.scans.startScan(params.scan_id);
          break;
        case 'abort_scan':
          result = await this.scans.abortScan(params.scan_id);
          break;
        case 'resume_scan':
          result = await this.scans.resumeScan(params.scan_id);
          break;

        // Vulnerability operations
        case 'list_vulnerabilities':
          result = await this.vulnerabilities.listVulnerabilities(params);
          break;
        case 'get_vulnerability':
          result = await this.vulnerabilities.getVulnerability(params.vuln_id);
          break;
        case 'update_vuln_status':
          result = await this.vulnerabilities.updateVulnerabilityStatus(params.vuln_id, params.status);
          break;
        case 'recheck_vuln':
          result = await this.vulnerabilities.recheckVulnerability(params.vuln_id);
          break;

        // Report operations
        case 'list_reports':
          result = await this.reports.listReports(params);
          break;
        case 'get_report':
          result = await this.reports.getReport(params.report_id);
          break;
        case 'create_report':
          result = await this.reports.createReport({
            type: params.report_type,
            format: params.format,
            source: params.source,
            template_id: params.template_id,
          });
          break;
        case 'delete_report':
          result = await this.reports.deleteReport(params.report_id);
          break;
        case 'download_report':
          result = await this.reports.downloadReport(params.descriptor);
          break;
        case 'get_templates':
          result = await this.reports.getReportTemplates();
          break;

        // Connection test
        case 'test_connection':
          const connected = await this.client.testConnection();
          result = {
            success: connected,
            data: { connected },
          };
          break;

        default:
          result = {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }

      return {
        success: result.success,
        data: result.data || result,
        error: result.error,
        metadata: {
          tool: this.name,
          action,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
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
   * Get input schema
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      action: z.enum([
        'list_targets', 'get_target', 'create_target', 'update_target', 'delete_target',
        'list_scans', 'get_scan', 'create_scan', 'start_scan', 'abort_scan', 'resume_scan',
        'list_vulnerabilities', 'get_vulnerability', 'update_vuln_status', 'recheck_vuln',
        'list_reports', 'get_report', 'create_report', 'delete_report', 'download_report',
        'get_templates', 'test_connection'
      ]).describe('Action to perform'),

      // Target parameters
      target_id: z.string().optional().describe('Target ID (for get/update/delete operations)'),
      address: z.string().optional().describe('Target address (for create operation)'),
      description: z.string().optional().describe('Target description'),
      type: z.enum(['default', 'api']).optional().describe('Target type'),
      criticality: z.number().min(0).max(100).optional().describe('Target criticality (0-100)'),

      // Scan parameters
      scan_id: z.string().optional().describe('Scan ID (for scan operations)'),
      profile_id: z.string().optional().describe('Scan profile ID (for create operation)'),

      // Vulnerability parameters
      vuln_id: z.string().optional().describe('Vulnerability ID'),
      status: z.enum(['open', 'fixed', 'false_positive', 'ignored', 'risk_accepted', 'retested']).optional().describe('Vulnerability status'),

      // Report parameters
      report_id: z.string().optional().describe('Report ID'),
      report_type: z.enum(['scan_vulnerabilities', 'comparison', 'sla', 'weekly', 'executive_summary', 'compliance']).optional().describe('Report type'),
      format: z.enum(['pdf', 'html', 'json', 'xml', 'mobile', 'rtf']).optional().describe('Report format'),
      source: z.any().optional().describe('Report source configuration'),
      template_id: z.string().optional().describe('Report template ID'),
      descriptor: z.string().optional().describe('Report download descriptor'),

      // Pagination
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      query: z.string().optional().describe('Search query'),
      sort: z.string().optional().describe('Sort field and order'),
    });
  }
}
