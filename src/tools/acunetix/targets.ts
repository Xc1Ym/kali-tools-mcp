/**
 * Acunetix Targets Management Tool
 * Manages scan targets in Acunetix
 */

import { z } from 'zod';
import { AcunetixClient, ApiResponse, PaginationParams } from './client.js';

/**
 * Target data structure
 */
export interface Target {
  target_id: string;
  address: string;
  description: string;
  type: string;
  criticality: number;
  default_profile?: string;
  continuous_mode?: boolean;
  threat_model?: number;
}

/**
 * Target list response
 */
export interface TargetListResponse {
  targets: Target[];
  pagination: {
    count: number;
    cursor?: string;
  };
}

/**
 * Target creation parameters
 */
export interface CreateTargetParams {
  address: string;
  description?: string;
  type?: 'default' | 'api';
  criticality?: number; // 0-100
}

/**
 * Target update parameters
 */
export interface UpdateTargetParams {
  description?: string;
  criticality?: number;
}

/**
 * Acunetix Targets Tool
 */
export class AcunetixTargetsTool {
  private client: AcunetixClient;

  constructor(client: AcunetixClient) {
    this.client = client;
  }

  /**
   * List all targets
   */
  async listTargets(params?: PaginationParams): Promise<ApiResponse<TargetListResponse>> {
    return this.client.get<TargetListResponse>('/targets', params);
  }

  /**
   * Get target by ID
   */
  async getTarget(targetId: string): Promise<ApiResponse<Target>> {
    return this.client.get<Target>(`/targets/${targetId}`);
  }

  /**
   * Create a new target
   */
  async createTarget(params: CreateTargetParams): Promise<ApiResponse<Target>> {
    const body = {
      address: params.address,
      description: params.description || '',
      type: params.type || 'default',
      criticality: params.criticality || 10,
    };

    return this.client.post<Target>('/targets', body);
  }

  /**
   * Create multiple targets
   */
  async createTargets(targets: CreateTargetParams[]): Promise<ApiResponse<{ targets: Target[] }>> {
    const body = {
      targets: targets.map(t => ({
        address: t.address,
        description: t.description || '',
        type: t.type || 'default',
        criticality: t.criticality || 10,
      })),
    };

    return this.client.post('/targets/add', body);
  }

  /**
   * Update target
   */
  async updateTarget(targetId: string, params: UpdateTargetParams): Promise<ApiResponse<Target>> {
    const body: any = {};
    if (params.description !== undefined) body.description = params.description;
    if (params.criticality !== undefined) body.criticality = params.criticality;

    return this.client.patch<Target>(`/targets/${targetId}`, body);
  }

  /**
   * Delete target
   */
  async deleteTarget(targetId: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/targets/${targetId}`);
  }

  /**
   * Delete multiple targets
   */
  async deleteTargets(targetIds: string[]): Promise<ApiResponse<void>> {
    return this.client.post('/targets/delete', { targets: targetIds });
  }

  /**
   * Get target's allowed hosts
   */
  async getAllowedHosts(targetId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/targets/${targetId}/allowed_hosts`);
  }

  /**
   * Add allowed host to target
   */
  async addAllowedHost(targetId: string, address: string): Promise<ApiResponse<any>> {
    return this.client.post(`/targets/${targetId}/allowed_hosts`, { address });
  }

  /**
   * Delete allowed host from target
   */
  async deleteAllowedHost(targetId: string, allowedHostId: string): Promise<ApiResponse<void>> {
    return this.client.delete(`/targets/${targetId}/allowed_hosts/${allowedHostId}`);
  }

  /**
   * Get target technologies
   */
  async getTechnologies(targetId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/targets/${targetId}/technologies`);
  }

  /**
   * Get vulnerabilities for target technology
   */
  async getTechnologyVulnerabilities(targetId: string, techId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/targets/${targetId}/technologies/${techId}/vulnerabilities`);
  }

  /**
   * Get input schema for listTargets
   */
  static getListInputSchema(): z.ZodSchema {
    return z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page (max 100)'),
      query: z.string().optional().describe('Search query string'),
      sort: z.string().optional().describe('Sort field and order (e.g., "address:asc")'),
    });
  }

  /**
   * Get input schema for getTarget
   */
  static getGetInputSchema(): z.ZodSchema {
    return z.object({
      target_id: z.string().describe('Target ID (UUID)'),
    });
  }

  /**
   * Get input schema for createTarget
   */
  static getCreateInputSchema(): z.ZodSchema {
    return z.object({
      address: z.string().describe('Target address (URL or IP)'),
      description: z.string().optional().describe('Target description'),
      type: z.enum(['default', 'api']).optional().describe('Target type'),
      criticality: z.number().min(0).max(100).optional().describe('Target criticality (0-100)'),
    });
  }

  /**
   * Get input schema for updateTarget
   */
  static getUpdateInputSchema(): z.ZodSchema {
    return z.object({
      target_id: z.string().describe('Target ID (UUID)'),
      description: z.string().optional().describe('New description'),
      criticality: z.number().min(0).max(100).optional().describe('New criticality (0-100)'),
    });
  }

  /**
   * Get input schema for deleteTarget
   */
  static getDeleteInputSchema(): z.ZodSchema {
    return z.object({
      target_id: z.string().describe('Target ID (UUID)'),
    });
  }

  /**
   * Get input schema for deleteTargets
   */
  static getDeleteManyInputSchema(): z.ZodSchema {
    return z.object({
      target_ids: z.array(z.string()).describe('Array of target IDs to delete'),
    });
  }
}
