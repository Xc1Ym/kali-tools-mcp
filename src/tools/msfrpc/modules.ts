/**
 * MSF 模块管理
 */

import { MsfRpcClient, MsfResponse } from './client.js';

export interface ModuleInfo {
  type: string;
  name: string;
  fullname: string;
  rank: string;
  disclosure_date?: string;
  references: string[];
  authors: string[];
  description: string;
  platform?: string;
  arch?: string;
}

export interface ModuleExecuteOptions {
  'OPTIONS'?: Record<string, any>;
  'RUNASJOB'?: boolean;
}

export interface ExploitResult {
  job_id?: number;
  result?: string;
  uri?: string;
}

export class MsfModules {
  constructor(private client: MsfRpcClient) {}

  /**
   * 搜索模块
   */
  async searchModules(query: string): Promise<MsfResponse<ModuleInfo[]>> {
    const result = await this.client.call<{ modules: Record<string, any> }>(
      'module.search',
      query
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const modules: ModuleInfo[] = Object.entries(result.data.modules || {}).map(
      ([key, value]) => {
        const [type, name] = key.split('/');
        return {
          type,
          name,
          fullname: key,
          rank: value.rank || 'unknown',
          disclosure_date: value.disclosure_date,
          references: value.references || [],
          authors: value.authors || [],
          description: value.description || '',
          platform: value.platform,
          arch: value.arch,
        };
      }
    );

    return { success: true, data: modules };
  }

  /**
   * 获取模块信息
   */
  async getModuleInfo(moduleName: string): Promise<MsfResponse<ModuleInfo>> {
    const result = await this.client.call<any>('module.info', moduleName);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const info = result.data;
    return {
      success: true,
      data: {
        type: info.type || 'unknown',
        name: info.name || moduleName,
        fullname: moduleName,
        rank: info.rank || 'unknown',
        disclosure_date: info.disclosure_date,
        references: info.references || [],
        authors: info.authors || [],
        description: info.description || '',
        platform: info.platform,
        arch: info.arch,
      },
    };
  }

  /**
   * 获取模块选项
   */
  async getModuleOptions(moduleName: string): Promise<MsfResponse<any>> {
    return this.client.call('module.options', moduleName);
  }

  /**
   * 获取模块目标
   */
  async getModuleTargets(moduleName: string): Promise<MsfResponse<any>> {
    return this.client.call('module.targets', moduleName);
  }

  /**
   * 执行 exploit
   */
  async executeExploit(
    moduleName: string,
    options?: ModuleExecuteOptions
  ): Promise<MsfResponse<ExploitResult>> {
    const result = await this.client.call<ExploitResult>(
      'module.execute',
      moduleName,
      options || {}
    );

    return result;
  }

  /**
   * 执行辅助模块
   */
  async executeAuxiliary(
    moduleName: string,
    options?: ModuleExecuteOptions
  ): Promise<MsfResponse<ExploitResult>> {
    const result = await this.client.call<ExploitResult>(
      'module.execute',
      moduleName,
      options || {}
    );

    return result;
  }

  /**
   * 获取可用的 exploit 模块列表
   */
  async getExploitModules(): Promise<MsfResponse<ModuleInfo[]>> {
    const result = await this.client.call<any>('module.exploits');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const modules: ModuleInfo[] = (result.data.modules || []).map((name: string) => ({
      type: 'exploit',
      name: name.replace(/^exploits\//, ''),
      fullname: name,
      rank: 'unknown',
      references: [],
      authors: [],
      description: '',
    }));

    return { success: true, data: modules };
  }

  /**
   * 获取可用的 auxiliary 模块列表
   */
  async getAuxiliaryModules(): Promise<MsfResponse<ModuleInfo[]>> {
    const result = await this.client.call<any>('module.auxiliary');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const modules: ModuleInfo[] = (result.data.modules || []).map((name: string) => ({
      type: 'auxiliary',
      name: name.replace(/^auxiliary\//, ''),
      fullname: name,
      rank: 'unknown',
      references: [],
      authors: [],
      description: '',
    }));

    return { success: true, data: modules };
  }

  /**
   * 获取可用的 post 模块列表
   */
  async getPostModules(): Promise<MsfResponse<ModuleInfo[]>> {
    const result = await this.client.call<any>('module.post');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const modules: ModuleInfo[] = (result.data.modules || []).map((name: string) => ({
      type: 'post',
      name: name.replace(/^post\//, ''),
      fullname: name,
      rank: 'unknown',
      references: [],
      authors: [],
      description: '',
    }));

    return { success: true, data: modules };
  }

  /**
   * 获取可用的 payload 模块列表
   */
  async getPayloadModules(): Promise<MsfResponse<ModuleInfo[]>> {
    const result = await this.client.call<any>('module.payloads');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const modules: ModuleInfo[] = (result.data.modules || []).map((name: string) => ({
      type: 'payload',
      name: name.replace(/^payloads\//, ''),
      fullname: name,
      rank: 'unknown',
      references: [],
      authors: [],
      description: '',
    }));

    return { success: true, data: modules };
  }

  /**
   * 获取所有模块类型统计
   */
  async getModuleStats(): Promise<
    MsfResponse<{ exploits: number; auxiliary: number; post: number; payloads: number; encoders: number; nops: number }>
  > {
    const [exploits, auxiliary, post, payloads] = await Promise.all([
      this.getExploitModules(),
      this.getAuxiliaryModules(),
      this.getPostModules(),
      this.getPayloadModules(),
    ]);

    return {
      success: true,
      data: {
        exploits: exploits.success ? (exploits.data?.length || 0) : 0,
        auxiliary: auxiliary.success ? (auxiliary.data?.length || 0) : 0,
        post: post.success ? (post.data?.length || 0) : 0,
        payloads: payloads.success ? (payloads.data?.length || 0) : 0,
        encoders: 0, // 这些信息可能需要从其他 API 获取
        nops: 0,
      },
    };
  }
}
