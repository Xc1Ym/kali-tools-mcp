/**
 * MSF 任务管理
 */

import { MsfRpcClient, MsfResponse } from './client.js';

export interface JobInfo {
  id: number;
  name: string;
  workspace?: string;
  module_name?: string;
  start_time?: number;
  username?: string;
  status?: string;
}

export class MsfJobs {
  constructor(private client: MsfRpcClient) {}

  /**
   * 列出所有运行中的任务
   */
  async listJobs(): Promise<MsfResponse<JobInfo[]>> {
    const result = await this.client.call<any>('job.list');

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const jobs: JobInfo[] = Object.entries(result.data || {}).map(([id, info]: [string, any]) => ({
      id: parseInt(id),
      ...info,
    }));

    return { success: true, data: jobs };
  }

  /**
   * 获取任务详情
   */
  async getJob(jobId: number): Promise<MsfResponse<JobInfo>> {
    const result = await this.client.call<any>('job.info', jobId);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        id: jobId,
        ...result.data,
      },
    };
  }

  /**
   * 停止任务
   */
  async stopJob(jobId: number): Promise<MsfResponse<boolean>> {
    const result = await this.client.call('job.stop', jobId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: true };
  }

  /**
   * 获取任务统计
   */
  async getJobStats(): Promise<
    MsfResponse<{
      total: number;
      running: number;
    }>
  > {
    const result = await this.listJobs();

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        total: result.data.length,
        running: result.data.length,
      },
    };
  }
}
