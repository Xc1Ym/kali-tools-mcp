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
    const result = await this.client.call<any[]>('module.search', query);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    // module.search() 直接返回数组，不是 { modules: {...} }
    const modules: ModuleInfo[] = result.data.map((item: any) => ({
      type: item.type || 'unknown',
      name: item.name || item.fullname?.split('/')[1] || 'unknown',
      fullname: item.fullname || 'unknown',
      rank: item.rank || 'unknown',
      disclosure_date: item.disclosuredate,
      references: item.references || [],
      authors: item.authors || [],
      description: item.description || item.name || '',
      platform: item.platform,
      arch: item.arch,
    }));

    return { success: true, data: modules };
  }

  /**
   * 获取模块信息
   * 注意：使用搜索来获取模块信息，因为 module.info API 有参数问题
   */
  async getModuleInfo(moduleName: string): Promise<MsfResponse<ModuleInfo>> {
    // 使用搜索来获取特定模块的信息
    const searchResult = await this.searchModules(moduleName);

    if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
      return { success: false, error: `Module not found: ${moduleName}` };
    }

    // 查找精确匹配的模块
    const exactMatch = searchResult.data.find(m => m.fullname === moduleName);
    if (exactMatch) {
      return { success: true, data: exactMatch };
    }

    // 如果没有精确匹配，返回第一个结果
    return { success: true, data: searchResult.data[0] };
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

    // module.exploits() 返回类数组对象，需要转换为数组
    const moduleNames = Array.from(result.data as any[]) || [];

    const modules: ModuleInfo[] = moduleNames.map((name: any) => ({
      type: 'exploit',
      name: String(name).replace(/^exploits\//, ''),
      fullname: String(name),
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

    const moduleNames = Array.from(result.data as any[]) || [];

    const modules: ModuleInfo[] = moduleNames.map((name: any) => ({
      type: 'auxiliary',
      name: String(name).replace(/^auxiliary\//, ''),
      fullname: String(name),
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

    const moduleNames = Array.from(result.data as any[]) || [];

    const modules: ModuleInfo[] = moduleNames.map((name: any) => ({
      type: 'post',
      name: String(name).replace(/^post\//, ''),
      fullname: String(name),
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

    const moduleNames = Array.from(result.data as any[]) || [];

    const modules: ModuleInfo[] = moduleNames.map((name: any) => ({
      type: 'payload',
      name: String(name).replace(/^payloads\//, ''),
      fullname: String(name),
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
