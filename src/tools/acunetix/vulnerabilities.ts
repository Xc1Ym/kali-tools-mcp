/**
 * Acunetix Vulnerabilities Management Tool
 * Manages vulnerabilities in Acunetix
 */

import { z } from 'zod';
import { AcunetixClient, ApiResponse, PaginationParams } from './client.js';

/**
 * Vulnerability data structure
 */
export interface Vulnerability {
  vuln_id: string;
  target_id: string;
  scan_id: string;
  vulnerability_name: string;
  severity: string;
  status: string;
  confidence: string;
  details: any;
  location: string;
  request: string;
  response: string;
  owasp: string;
  cwe: string;
  cvss_score: number;
  cvss_vector: string;
  tags: string[];
}

/**
 * Vulnerability list response
 */
export interface VulnerabilityListResponse {
  vulnerabilities: Vulnerability[];
  pagination: {
    count: number;
    cursor?: string;
  };
}

/**
 * Vulnerability status update
 */
export type VulnerabilityStatus =
  | 'open'
  | 'fixed'
  | 'false_positive'
  | 'ignored'
  | 'risk_accepted'
  | 'retested';

/**
 * Acunetix Vulnerabilities Tool
 */
export class AcunetixVulnerabilitiesTool {
  private client: AcunetixClient;

  constructor(client: AcunetixClient) {
    this.client = client;
  }

  /**
   * List all vulnerabilities
   */
  async listVulnerabilities(params?: PaginationParams): Promise<ApiResponse<VulnerabilityListResponse>> {
    return this.client.get<VulnerabilityListResponse>('/vulnerabilities', params);
  }

  /**
   * Get vulnerability by ID
   */
  async getVulnerability(vulnId: string): Promise<ApiResponse<Vulnerability>> {
    return this.client.get<Vulnerability>(`/vulnerabilities/${vulnId}`);
  }

  /**
   * Get vulnerability HTTP response
   */
  async getVulnerabilityHttpResponse(vulnId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/vulnerabilities/${vulnId}/http_response`);
  }

  /**
   * Update vulnerability status
   */
  async updateVulnerabilityStatus(
    vulnId: string,
    status: VulnerabilityStatus
  ): Promise<ApiResponse<void>> {
    return this.client.patch(`/vulnerabilities/${vulnId}/status`, { status });
  }

  /**
   * Recheck vulnerability
   */
  async recheckVulnerability(vulnId: string): Promise<ApiResponse<any>> {
    return this.client.post(`/vulnerabilities/${vulnId}/recheck`);
  }

  /**
   * Recheck multiple vulnerabilities
   */
  async recheckVulnerabilities(vulnIds: string[]): Promise<ApiResponse<any>> {
    return this.client.post('/vulnerabilities/recheck', { vulnerability_ids: vulnIds });
  }

  /**
   * Get vulnerability groups
   */
  async getVulnerabilityGroups(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get('/vulnerability_groups', params);
  }

  /**
   * Get vulnerability types
   */
  async getVulnerabilityTypes(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get('/vulnerability_types', params);
  }

  /**
   * Get vulnerability type details
   */
  async getVulnerabilityTypeDetails(vtId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/vulnerability_types/${vtId}`);
  }

  /**
   * Get vulnerability issues (for issue tracking integration)
   */
  async getVulnerabilityIssues(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.client.get('/vulnerabilities/issues', params);
  }

  /**
   * Get vulnerabilities from a specific scan result
   */
  async getScanVulnerabilities(
    scanId: string,
    resultId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<VulnerabilityListResponse>> {
    return this.client.get<VulnerabilityListResponse>(
      `/scans/${scanId}/results/${resultId}/vulnerabilities`,
      params
    );
  }

  /**
   * Get specific vulnerability from scan
   */
  async getScanVulnerability(
    scanId: string,
    resultId: string,
    vulnId: string
  ): Promise<ApiResponse<Vulnerability>> {
    return this.client.get<Vulnerability>(
      `/scans/${scanId}/results/${resultId}/vulnerabilities/${vulnId}`
    );
  }

  /**
   * Get vulnerability HTTP response from scan
   */
  async getScanVulnerabilityHttpResponse(
    scanId: string,
    resultId: string,
    vulnId: string
  ): Promise<ApiResponse<any>> {
    return this.client.get(`/scans/${scanId}/results/${resultId}/vulnerabilities/${vulnId}/http_response`);
  }

  /**
   * Update scan vulnerability status
   */
  async updateScanVulnerabilityStatus(
    scanId: string,
    resultId: string,
    vulnId: string,
    status: VulnerabilityStatus
  ): Promise<ApiResponse<void>> {
    return this.client.patch(`/scans/${scanId}/results/${resultId}/vulnerabilities/${vulnId}/status`, {
      status,
    });
  }

  /**
   * Recheck scan vulnerability
   */
  async recheckScanVulnerability(
    scanId: string,
    resultId: string,
    vulnId: string
  ): Promise<ApiResponse<any>> {
    return this.client.post(`/scans/${scanId}/results/${resultId}/vulnerabilities/${vulnId}/recheck`);
  }

  /**
   * Recheck all vulnerabilities in scan
   */
  async recheckScanVulnerabilities(
    scanId: string,
    resultId: string
  ): Promise<ApiResponse<any>> {
    return this.client.post(`/scans/${scanId}/results/${resultId}/vulnerabilities/recheck`);
  }

  /**
   * Get vulnerability severity statistics
   */
  async getSeverityStats(params?: PaginationParams): Promise<ApiResponse<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  }>> {
    const response = await this.listVulnerabilities(params);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const vuln of response.data.vulnerabilities) {
      const severity = vuln.severity.toLowerCase();
      if (severity === 'critical') stats.critical++;
      else if (severity === 'high') stats.high++;
      else if (severity === 'medium') stats.medium++;
      else if (severity === 'low') stats.low++;
      else if (severity === 'info') stats.info++;
    }

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get input schema for listVulnerabilities
   */
  static getListInputSchema(): z.ZodSchema {
    return z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page (max 100)'),
      query: z.string().optional().describe('Search query string'),
      sort: z.string().optional().describe('Sort field and order (e.g., "severity:desc")'),
    });
  }

  /**
   * Get input schema for getVulnerability
   */
  static getGetInputSchema(): z.ZodSchema {
    return z.object({
      vuln_id: z.string().describe('Vulnerability ID (UUID)'),
    });
  }

  /**
   * Get input schema for updateVulnerabilityStatus
   */
  static getUpdateStatusInputSchema(): z.ZodSchema {
    return z.object({
      vuln_id: z.string().describe('Vulnerability ID (UUID)'),
      status: z.enum(['open', 'fixed', 'false_positive', 'ignored', 'risk_accepted', 'retested'])
        .describe('New vulnerability status'),
    });
  }

  /**
   * Get input schema for recheckVulnerability
   */
  static getRecheckInputSchema(): z.ZodSchema {
    return z.object({
      vuln_id: z.string().describe('Vulnerability ID (UUID)'),
    });
  }

  /**
   * Get input schema for getScanVulnerabilities
   */
  static getScanListInputSchema(): z.ZodSchema {
    return z.object({
      scan_id: z.string().describe('Scan ID (UUID)'),
      result_id: z.string().describe('Result ID (UUID)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      query: z.string().optional().describe('Search query string'),
      sort: z.string().optional().describe('Sort field and order'),
    });
  }
}
