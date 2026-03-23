/**
 * MSFRPC 客户端
 * 用于与 Metasploit Framework RPC 服务通信
 */

import msfrpc from 'msfrpc';

export interface MsfRpcConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  uri?: string;
  timeout?: number;
}

export interface MsfResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MsfRpcClient {
  private client: any;
  private config: MsfRpcConfig;

  constructor(config: MsfRpcConfig) {
    this.config = {
      ...config,
      uri: config.uri || '/api/',
      timeout: config.timeout || 30000,
    };
  }

  /**
   * 连接到 MSFRPC 服务
   */
  async connect(): Promise<MsfResponse<boolean>> {
    try {
      const uri = `https://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
      this.client = new msfrpc(uri);

      await this.client.connect();
      return { success: true, data: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to MSFRPC',
      };
    }
  }

  /**
   * 确保 API 连接已建立
   */
  private async ensureConnected(): Promise<void> {
    if (!this.client) {
      await this.connect();
    }
  }

  /**
   * 通用方法调用
   */
  async call<T = any>(method: string, ...args: any[]): Promise<MsfResponse<T>> {
    try {
      await this.ensureConnected();

      // 解析方法组和方法名
      const [group, methodName] = method.split('.');

      // 直接使用方法名，让 msfrpc 库处理转换
      const result = await this.client[group][methodName](...args);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || `Method call failed: ${method}`,
      };
    }
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<MsfResponse<string>> {
    return this.call<string>('core.version');
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<MsfResponse<any>> {
    return this.call('core.moduleStats');
  }

  /**
   * 停止 MSFRPC 连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.auth.logout();
      } catch (error) {
        // Ignore logout errors
      }
      this.client = null;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}
