/**
 * MSF 工作区、主机和服务管理
 */

import { MsfRpcClient, MsfResponse } from './client.js';

export interface Workspace {
  name: string;
  boundary?: string;
  description?: string;
  owner?: string;
  created_at?: number;
  updated_at?: number;
  limit_to_network?: boolean;
}

export interface Host {
  id: number;
  workspace: string;
  address: string;
  mac?: string;
  comm?: string;
  name?: string;
  state?: string;
  os_name?: string;
  os_flavor?: string;
  os_sp?: string;
  purpose?: string;
  info?: string;
  comments?: string;
  scope?: string;
  virtual_host?: string;
  created_at?: number;
  updated_at?: number;
}

export interface Service {
  id: number;
  workspace: string;
  host: string;
  port: number;
  proto: string;
  state?: string;
  name?: string;
  info?: string;
  created_at?: number;
  updated_at?: number;
}

export interface Vulnerability {
  id: number;
  workspace: string;
  host: string;
  name: string;
  refs?: string[];
  info?: string;
  created_at?: number;
  updated_at?: number;
}

export interface Credential {
  id: number;
  workspace: string;
  origin?: string;
  service_name?: string;
  address?: string;
  port?: number;
  protocol?: string;
  public?: any;
  private?: any;
  private_type?: string;
  created_at?: number;
  updated_at?: number;
}

export class MsfWorkspace {
  constructor(private client: MsfRpcClient) {}

  /**
   * 列出所有工作区
   */
  async listWorkspaces(): Promise<MsfResponse<Workspace[]>> {
    const result = await this.client.call<any>('pro.workspaces');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.workspaces || [] };
  }

  /**
   * 获取当前工作区
   */
  async getCurrentWorkspace(): Promise<MsfResponse<string>> {
    const result = await this.client.call<any>('pro.workspace');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.workspace || 'default' };
  }

  /**
   * 设置工作区
   */
  async setWorkspace(workspaceName: string): Promise<MsfResponse<boolean>> {
    const result = await this.client.call('pro.set_workspace', workspaceName);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: true };
  }

  /**
   * 创建工作区
   */
  async createWorkspace(workspaceName: string): Promise<MsfResponse<Workspace>> {
    const result = await this.client.call<any>('pro.add_workspace', workspaceName);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * 删除工作区
   */
  async deleteWorkspace(workspaceName: string): Promise<MsfResponse<boolean>> {
    const result = await this.client.call('pro.delete_workspace', workspaceName);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: true };
  }

  /**
   * 列出主机
   */
  async listHosts(workspace?: string): Promise<MsfResponse<Host[]>> {
    if (workspace) {
      await this.setWorkspace(workspace);
    }

    const result = await this.client.call<any>('pro.clients');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.clients || [] };
  }

  /**
   * 添加主机
   */
  async addHost(
    address: string,
    options?: Partial<Host>
  ): Promise<MsfResponse<Host>> {
    const result = await this.client.call<any>('pro.add_client', address, options || {});

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * 获取主机详情
   */
  async getHost(hostId: number): Promise<MsfResponse<Host>> {
    const result = await this.client.call<any>('pro.report_client', hostId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.client };
  }

  /**
   * 列出服务
   */
  async listServices(workspace?: string): Promise<MsfResponse<Service[]>> {
    if (workspace) {
      await this.setWorkspace(workspace);
    }

    const result = await this.client.call<any>('pro.services');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.services || [] };
  }

  /**
   * 添加服务
   */
  async addService(
    host: string,
    port: number,
    proto: string,
    options?: Partial<Service>
  ): Promise<MsfResponse<Service>> {
    const result = await this.client.call<any>(
      'pro.add_service',
      host,
      {
        port,
        proto,
        ...options,
      }
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * 列出漏洞
   */
  async listVulnerabilities(workspace?: string): Promise<MsfResponse<Vulnerability[]>> {
    if (workspace) {
      await this.setWorkspace(workspace);
    }

    const result = await this.client.call<any>('pro.vulns');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.vulns || [] };
  }

  /**
   * 添加漏洞
   */
  async addVulnerability(
    host: string,
    name: string,
    options?: Partial<Vulnerability>
  ): Promise<MsfResponse<Vulnerability>> {
    const result = await this.client.call<any>(
      'pro.add_vuln',
      host,
      name,
      options || {}
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * 列出凭证
   */
  async listCredentials(workspace?: string): Promise<MsfResponse<Credential[]>> {
    if (workspace) {
      await this.setWorkspace(workspace);
    }

    const result = await this.client.call<any>('pro.creds');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.creds || [] };
  }

  /**
   * 添加凭证
   */
  async addCredential(
    cred: Partial<Credential>
  ): Promise<MsfResponse<Credential>> {
    const result = await this.client.call<any>('pro.add_cred', cred);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * 获取工作区统计
   */
  async getWorkspaceStats(
    workspace?: string
  ): Promise<
    MsfResponse<{
      hosts: number;
      services: number;
      vulns: number;
      creds: number;
    }>
  > {
    if (workspace) {
      await this.setWorkspace(workspace);
    }

    const [hosts, services, vulns, creds] = await Promise.all([
      this.listHosts(),
      this.listServices(),
      this.listVulnerabilities(),
      this.listCredentials(),
    ]);

    return {
      success: true,
      data: {
        hosts: hosts.success ? (hosts.data?.length || 0) : 0,
        services: services.success ? (services.data?.length || 0) : 0,
        vulns: vulns.success ? (vulns.data?.length || 0) : 0,
        creds: creds.success ? (creds.data?.length || 0) : 0,
      },
    };
  }
}
