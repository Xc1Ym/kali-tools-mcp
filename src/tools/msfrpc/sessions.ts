/**
 * MSF 会话管理
 */

import { MsfRpcClient, MsfResponse } from './client.js';

export interface SessionInfo {
  id: number;
  type: string;
  tunnel_local: string;
  tunnel_peer: string;
  via_exploit: string;
  uuid: string;
  exploited_host?: string;
  workspace?: string;
  routes?: string[];
  arch?: string;
  platform?: string;
  desc?: string;
  last_seen?: string;
}

export interface SessionListResponse {
  sessions: Record<string, SessionInfo>;
}

export class MsfSessions {
  constructor(private client: MsfRpcClient) {}

  /**
   * 列出所有活动会话
   */
  async listSessions(): Promise<MsfResponse<SessionInfo[]>> {
    const result = await this.client.call<SessionListResponse>('session.list');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const sessionsObj = result.data.sessions || {};
    const sessions: SessionInfo[] = Object.entries(sessionsObj).map(([id, s]: [string, any]) => ({
      ...s,
      id: parseInt(id),
    }));

    return { success: true, data: sessions };
  }

  /**
   * 获取会话详细信息
   */
  async getSession(sessionId: number): Promise<MsfResponse<SessionInfo>> {
    const result = await this.client.call<any>('session.info', sessionId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        id: sessionId,
        ...result.data,
      },
    };
  }

  /**
   * 在会话中执行命令
   */
  async executeCommand(
    sessionId: number,
    command: string
  ): Promise<MsfResponse<string>> {
    const result = await this.client.call<any>('session.shell_write', sessionId, command);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 读取输出
    const readResult = await this.client.call<any>('session.shell_read', sessionId);

    if (!readResult.success || !readResult.data) {
      return { success: false, error: readResult.error };
    }

    return { success: true, data: readResult.data.data || '' };
  }

  /**
   * 读取会话输出
   */
  async readOutput(sessionId: number): Promise<MsfResponse<string>> {
    const result = await this.client.call<any>('session.shell_read', sessionId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.data || '' };
  }

  /**
   * 在 Meterpreter 会话中执行命令
   */
  async executeMeterpreterCommand(
    sessionId: number,
    command: string
  ): Promise<MsfResponse<any>> {
    return this.client.call('session.meterpreter_run', sessionId, command);
  }

  /**
   * 升级 shell 到 meterpreter
   */
  async upgradeToMeterpreter(
    sessionId: number,
    lhost: string,
    lport: number
  ): Promise<MsfResponse<number>> {
    const result = await this.client.call<any>(
      'session.shell_upgrade',
      sessionId,
      lhost,
      lport
    );

    return result;
  }

  /**
   * 分离会话
   */
  async detachSession(sessionId: number): Promise<MsfResponse<boolean>> {
    const result = await this.client.call('session.detach', sessionId);
    return result;
  }

  /**
   * 终止会话
   */
  async killSession(sessionId: number): Promise<MsfResponse<boolean>> {
    const result = await this.client.call('session.stop', sessionId);
    return result;
  }

  /**
   * 获取会话兼容的模块
   */
  async getCompatibleModules(sessionId: number): Promise<MsfResponse<string[]>> {
    const result = await this.client.call<any>('session.compatible_modules', sessionId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data.modules || [] };
  }

  /**
   * 在会话中执行 post 模块
   */
  async executePostModule(
    sessionId: number,
    moduleName: string
  ): Promise<MsfResponse<any>> {
    const result = await this.client.call(
      'session.execute_post_module',
      sessionId,
      moduleName
    );

    return result;
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(): Promise<
    MsfResponse<{
      total: number;
      meterpreter: number;
      shell: number;
      other: number;
    }>
  > {
    const result = await this.listSessions();

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const sessions = result.data;
    const stats = {
      total: sessions.length,
      meterpreter: 0,
      shell: 0,
      other: 0,
    };

    sessions.forEach((session) => {
      if (session.type === 'meterpreter') {
        stats.meterpreter++;
      } else if (session.type === 'shell') {
        stats.shell++;
      } else {
        stats.other++;
      }
    });

    return { success: true, data: stats };
  }
}
