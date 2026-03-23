/**
 * Acunetix Reports Management Tool
 * Manages reports in Acunetix
 */

import { z } from 'zod';
import { AcunetixClient, ApiResponse, PaginationParams } from './client.js';

/**
 * Report template
 */
export interface ReportTemplate {
  template_id: string;
  name: string;
  group: string;
  accepted_sources: string[];
}

/**
 * Report type
 */
export type ReportType =
  | 'scan_vulnerabilities'
  | 'comparison'
  | 'sla'
  | 'weekly'
  | 'executive_summary'
  | 'compliance';

/**
 * Report format
 */
export type ReportFormat = 'pdf' | 'html' | 'json' | 'xml' | 'mobile' | 'rtf';

/**
 * Report creation parameters
 */
export interface CreateReportParams {
  type: ReportType;
  format: ReportFormat;
  source: {
    list_type: 'scans' | 'targets' | 'scan_groups' | 'target_groups';
    id_list: string[];
  };
  template_id?: string;
  report_filename?: string;
  scope?: string[];
}

/**
 * Report data structure
 */
export interface Report {
  report_id: string;
  target_id: string;
  scan_id: string;
  generation_state: string;
  template_id: string;
  report_type: string;
  format: string;
  source: {
    list_type: string;
    id_list: string[];
  };
}

/**
 * Acunetix Reports Tool
 */
export class AcunetixReportsTool {
  private client: AcunetixClient;

  constructor(client: AcunetixClient) {
    this.client = client;
  }

  /**
   * List all reports
   */
  async listReports(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get('/reports', params);
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<ApiResponse<Report>> {
    return this.client.get<Report>(`/reports/${reportId}`);
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/reports/${reportId}`);
  }

  /**
   * Delete multiple reports
   */
  async deleteReports(reportIds: string[]): Promise<ApiResponse<void>> {
    return this.client.post('/reports/delete', { report_ids: reportIds });
  }

  /**
   * Download report
   */
  async downloadReport(descriptor: string): Promise<ApiResponse<Buffer>> {
    const response = await this.client.get<Buffer>(`/reports/download/${descriptor}`);

    // Note: This returns raw data, not JSON
    // The caller should handle the binary data appropriately
    return response;
  }

  /**
   * Generate report URL for download
   */
  getReportDownloadUrl(descriptor: string): string {
    return `${this.client['baseUrl'].href}reports/download/${descriptor}`;
  }

  /**
   * Create a new report
   */
  async createReport(params: CreateReportParams): Promise<ApiResponse<Report>> {
    const body: any = {
      type: params.type,
      format: params.format,
      source: params.source,
    };

    if (params.template_id) {
      body.template_id = params.template_id;
    }

    if (params.report_filename) {
      body.report_filename = params.report_filename;
    }

    if (params.scope) {
      body.scope = params.scope;
    }

    return this.client.post<Report>('/reports', body);
  }

  /**
   * Get report templates
   */
  async getReportTemplates(): Promise<ApiResponse<{ templates: ReportTemplate[] }>> {
    return this.client.get('/report_templates');
  }

  /**
   * Get export types
   */
  async getExportTypes(): Promise<ApiResponse<any>> {
    return this.client.get('/export_types');
  }

  /**
   * List exports
   */
  async listExports(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get('/exports', params);
  }

  /**
   * Get export by ID
   */
  async getExport(exportId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/exports/${exportId}`);
  }

  /**
   * Delete export
   */
  async deleteExport(exportId: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/exports/${exportId}`);
  }

  /**
   * Delete multiple exports
   */
  async deleteExports(exportIds: string[]): Promise<ApiResponse<void>> {
    return this.client.post('/exports/delete', { export_ids: exportIds });
  }

  /**
   * Repeat report
   */
  async repeatReport(reportId: string): Promise<ApiResponse<Report>> {
    return this.client.post<Report>(`/reports/${reportId}/repeat`);
  }

  /**
   * Wait for report generation
   */
  async waitForReportGeneration(
    reportId: string,
    checkInterval: number = 2000,
    timeout: number = 300000
  ): Promise<ApiResponse<Report>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.getReport(reportId);

      if (!response.success || !response.data) {
        return response;
      }

      const report = response.data;

      // Check if report is generated
      if (report.generation_state === 'generated') {
        return response;
      }

      // Check if generation failed
      if (report.generation_state === 'failed') {
        return {
          success: false,
          error: 'Report generation failed',
        };
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return {
      success: false,
      error: 'Report generation timeout',
    };
  }

  /**
   * Get input schema for listReports
   */
  static getListInputSchema(): z.ZodSchema {
    return z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page (max 100)'),
      query: z.string().optional().describe('Search query string'),
      sort: z.string().optional().describe('Sort field and order'),
    });
  }

  /**
   * Get input schema for getReport
   */
  static getGetInputSchema(): z.ZodSchema {
    return z.object({
      report_id: z.string().describe('Report ID (UUID)'),
    });
  }

  /**
   * Get input schema for createReport
   */
  static getCreateInputSchema(): z.ZodSchema {
    return z.object({
      type: z.enum([
        'scan_vulnerabilities',
        'comparison',
        'sla',
        'weekly',
        'executive_summary',
        'compliance',
      ]).describe('Report type'),
      format: z.enum(['pdf', 'html', 'json', 'xml', 'mobile', 'rtf'])
        .describe('Report format'),
      source_list_type: z.enum(['scans', 'targets', 'scan_groups', 'target_groups'])
        .describe('Source list type'),
      source_id_list: z.array(z.string()).describe('List of source IDs'),
      template_id: z.string().optional().describe('Report template ID (UUID)'),
      report_filename: z.string().optional().describe('Custom report filename'),
      scope: z.array(z.string()).optional().describe('Report scope filters'),
    });
  }

  /**
   * Get input schema for deleteReport
   */
  static getDeleteInputSchema(): z.ZodSchema {
    return z.object({
      report_id: z.string().describe('Report ID (UUID)'),
    });
  }

  /**
   * Get input schema for downloadReport
   */
  static getDownloadInputSchema(): z.ZodSchema {
    return z.object({
      descriptor: z.string().describe('Report download descriptor'),
      save_path: z.string().optional().describe('Local path to save the report file'),
    });
  }
}
