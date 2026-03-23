/**
 * Acunetix Scans Management Tool
 * Manages scans in Acunetix
 */

import { z } from 'zod';
import { AcunetixClient, ApiResponse, PaginationParams } from './client.js';

/**
 * Scan data structure
 */
export interface Scan {
  scan_id: string;
  target_id: string;
  profile_id: string;
  schedule?: {
    disable: boolean;
    start_date?: string;
    time_sensitive?: boolean;
  };
  ui_session_id?: string;
  initiator_id: string;
  status: string;
  progress: number;
  is_licensed: boolean;
}

/**
 * Scan list response
 */
export interface ScanListResponse {
  scans: Scan[];
  pagination: {
    count: number;
    cursor?: string;
  };
}

/**
 * Scan creation parameters
 */
export interface CreateScanParams {
  target_id: string;
  profile_id: string;
  schedule?: {
    disable: boolean;
    start_date?: string;
    time_sensitive?: boolean;
  };
  ui_session_id?: string;
}

/**
 * Scan result summary
 */
export interface ScanResult {
  target_id: string;
  scan_id: string;
  status: string;
  crit: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

/**
 * Acunetix Scans Tool
 */
export class AcunetixScansTool {
  private client: AcunetixClient;

  constructor(client: AcunetixClient) {
    this.client = client;
  }

  /**
   * List all scans
   */
  async listScans(params?: PaginationParams): Promise<ApiResponse<ScanListResponse>> {
    return this.client.get<ScanListResponse>('/scans', params);
  }

  /**
   * Get scan by ID
   */
  async getScan(scanId: string): Promise<ApiResponse<Scan>> {
    return this.client.get<Scan>(`/scans/${scanId}`);
  }

  /**
   * Create a new scan
   */
  async createScan(params: CreateScanParams): Promise<ApiResponse<Scan>> {
    const body: any = {
      target_id: params.target_id,
      profile_id: params.profile_id,
    };

    if (params.schedule) {
      body.schedule = params.schedule;
    }

    if (params.ui_session_id) {
      body.ui_session_id = params.ui_session_id;
    }

    return this.client.post<Scan>('/scans', body);
  }

  /**
   * Trigger/Start a scan
   */
  async startScan(scanId: string): Promise<ApiResponse<any>> {
    return this.client.post(`/scans/${scanId}/trigger`);
  }

  /**
   * Abort a running scan
   */
  async abortScan(scanId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/scans/${scanId}/abort`);
  }

  /**
   * Resume a paused/aborted scan
   */
  async resumeScan(scanId: string): Promise<ApiResponse<void>> {
    return this.client.post<void>(`/scans/${scanId}/resume`);
  }

  /**
   * Get scan results
   */
  async getScanResults(scanId: string, params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results`, params);
  }

  /**
   * Get scan result by ID
   */
  async getScanResult(scanId: string, resultId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}`);
  }

  /**
   * Get scan statistics
   */
  async getScanStatistics(scanId: string, resultId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/statistics`);
  }

  /**
   * Get vulnerabilities from scan
   */
  async getScanVulnerabilities(
    scanId: string,
    resultId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/vulnerabilities`, params);
  }

  /**
   * Get specific vulnerability from scan
   */
  async getScanVulnerability(scanId: string, resultId: string, vulnId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/vulnerabilities/${vulnId}`);
  }

  /**
   * Get technologies detected in scan
   */
  async getScanTechnologies(scanId: string, resultId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/technologies`);
  }

  /**
   * Get crawl data from scan
   */
  async getScanCrawlData(scanId: string, resultId: string, params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/crawldata`, params);
  }

  /**
   * Get vulnerability types from scan
   */
  async getScanVulnerabilityTypes(scanId: string, resultId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/vulnerability_types`);
  }

  /**
   * Wait for scan completion
   */
  async waitForScanCompletion(
    scanId: string,
    checkInterval: number = 5000,
    timeout: number = 3600000
  ): Promise<ApiResponse<Scan>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.getScan(scanId);

      if (!response.success || !response.data) {
        return response;
      }

      const scan = response.data;
      const status = scan.status.toLowerCase();

      // Check if scan is complete
      if (status === 'completed' || status === 'failed' || status === 'aborted') {
        return response;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return {
      success: false,
      error: 'Scan completion timeout',
    };
  }

  /**
   * Get input schema for listScans
   */
  static getListInputSchema(): z.ZodSchema {
    return z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page (max 100)'),
      query: z.string().optional().describe('Search query string'),
      sort: z.string().optional().describe('Sort field and order (e.g., "status:asc")'),
    });
  }

  /**
   * Get input schema for getScan
   */
  static getGetInputSchema(): z.ZodSchema {
    return z.object({
      scan_id: z.string().describe('Scan ID (UUID)'),
    });
  }

  /**
   * Get input schema for createScan
   */
  static getCreateInputSchema(): z.ZodSchema {
    return z.object({
      target_id: z.string().describe('Target ID to scan'),
      profile_id: z.string().describe('Scan profile ID'),
      schedule_disable: z.boolean().optional().describe('Disable scheduled scan'),
      schedule_start_date: z.string().optional().describe('Schedule start date (ISO 8601 format)'),
      schedule_time_sensitive: z.boolean().optional().describe('Time-sensitive schedule'),
    });
  }

  /**
   * Get input schema for startScan
   */
  static getStartInputSchema(): z.ZodSchema {
    return z.object({
      scan_id: z.string().describe('Scan ID (UUID)'),
    });
  }

  /**
   * Get input schema for abortScan
   */
  static getAbortInputSchema(): z.ZodSchema {
    return z.object({
      scan_id: z.string().describe('Scan ID (UUID)'),
    });
  }

  /**
   * Get input schema for resumeScan
   */
  static getResumeInputSchema(): z.ZodSchema {
    return z.object({
      scan_id: z.string().describe('Scan ID (UUID)'),
    });
  }

  /**
   * Get input schema for getScanResults
   */
  static getResultsInputSchema(): z.ZodSchema {
    return z.object({
      scan_id: z.string().describe('Scan ID (UUID)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      query: z.string().optional().describe('Search query string'),
      sort: z.string().optional().describe('Sort field and order'),
    });
  }
}
