/**
 * MSFRPC MCP 工具
 * 集成 Metasploit Framework 功能
 */

import { z } from 'zod';
import { BaseToolWrapper, ToolParams, ValidationResult, ToolResult } from './base.js';
import { MsfRpcClient, MsfResponse } from './msfrpc/client.js';
import { MsfModules } from './msfrpc/modules.js';
import { MsfSessions } from './msfrpc/sessions.js';
import { MsfWorkspace } from './msfrpc/workspace.js';
import { MsfJobs } from './msfrpc/jobs.js';
import { loadSecurityConfig } from '../utils/security.js';

/**
 * MSFRPC Tool Wrapper
 * Provides access to all Metasploit Framework functionality
 */
export class MsfRpcTool extends BaseToolWrapper {
  name = 'msfrpc';
  description = 'Metasploit Framework integration - modules, sessions, workspace, jobs, credentials';
  version = '1.0.0';

  private client: MsfRpcClient | null = null;
  private modules: MsfModules | null = null;
  private sessions: MsfSessions | null = null;
  private workspace: MsfWorkspace | null = null;
  private jobs: MsfJobs | null = null;

  /**
   * Initialize MSFRPC client
   */
  private async initializeClient(): Promise<boolean> {
    if (this.client) {
      return true;
    }

    try {
      const config = await loadSecurityConfig();
      const msfConfig = config.msfrpc;

      if (!msfConfig || !msfConfig.host || !msfConfig.username || !msfConfig.password) {
        throw new Error('MSFRPC configuration is incomplete. Set msfrpc config in config/default.json');
      }

      this.client = new MsfRpcClient({
        host: msfConfig.host || 'localhost',
        port: msfConfig.port || 55553,
        username: msfConfig.username,
        password: msfConfig.password,
        uri: msfConfig.uri || '/api/',
        timeout: msfConfig.timeout || 30000,
      });

      await this.client.connect();
      this.modules = new MsfModules(this.client);
      this.sessions = new MsfSessions(this.client);
      this.workspace = new MsfWorkspace(this.client);
      this.jobs = new MsfJobs(this.client);

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize MSFRPC client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate parameters
   */
  validateParams(params: ToolParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!params.action) {
      errors.push('action parameter is required');
    } else {
      const validActions = [
        'search_modules', 'get_module_info', 'get_module_options', 'execute_exploit', 'execute_auxiliary', 'get_module_stats',
        'list_sessions', 'get_session', 'execute_command', 'kill_session', 'get_session_stats',
        'list_workspaces', 'set_workspace', 'create_workspace', 'list_hosts', 'list_services', 'list_vulnerabilities', 'list_credentials', 'get_workspace_stats',
        'list_jobs', 'stop_job', 'get_job_stats',
        'get_version', 'get_stats',
      ];

      if (!validActions.includes(params.action)) {
        errors.push(`Invalid action: ${params.action}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build args (not used for MSFRPC)
   */
  buildArgs(params: ToolParams): string[] {
    return [];
  }

  /**
   * Parse output (not used for MSFRPC)
   */
  parseOutput(stdout: string, stderr: string): any {
    return {};
  }

  /**
   * Check if MSFRPC is available
   */
  async checkAvailable(): Promise<boolean> {
    try {
      await this.initializeClient();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute MSFRPC operation
   */
  async execute(params: ToolParams): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      await this.initializeClient();

      const { action } = params;
      let result: MsfResponse<any>;

      switch (action) {
        // 模块管理
        case 'search_modules':
          result = await this.modules!.searchModules(params.query || '');
          break;

        case 'get_module_info':
          result = await this.modules!.getModuleInfo(params.module_name);
          break;

        case 'get_module_options':
          result = await this.modules!.getModuleOptions(params.module_name);
          break;

        case 'execute_exploit':
          result = await this.modules!.executeExploit(params.module_name, params.options);
          break;

        case 'execute_auxiliary':
          result = await this.modules!.executeAuxiliary(params.module_name, params.options);
          break;

        case 'get_module_stats':
          result = await this.modules!.getModuleStats();
          break;

        // 会话管理
        case 'list_sessions':
          result = await this.sessions!.listSessions();
          break;

        case 'get_session':
          result = await this.sessions!.getSession(params.session_id);
          break;

        case 'execute_command':
          result = await this.sessions!.executeCommand(params.session_id, params.command);
          break;

        case 'kill_session':
          result = await this.sessions!.killSession(params.session_id);
          break;

        case 'get_session_stats':
          result = await this.sessions!.getSessionStats();
          break;

        // 工作区管理
        case 'list_workspaces':
          result = await this.workspace!.listWorkspaces();
          break;

        case 'set_workspace':
          result = await this.workspace!.setWorkspace(params.workspace_name);
          break;

        case 'create_workspace':
          result = await this.workspace!.createWorkspace(params.workspace_name);
          break;

        case 'list_hosts':
          result = await this.workspace!.listHosts(params.workspace_name);
          break;

        case 'list_services':
          result = await this.workspace!.listServices(params.workspace_name);
          break;

        case 'list_vulnerabilities':
          result = await this.workspace!.listVulnerabilities(params.workspace_name);
          break;

        case 'list_credentials':
          result = await this.workspace!.listCredentials(params.workspace_name);
          break;

        case 'get_workspace_stats':
          result = await this.workspace!.getWorkspaceStats(params.workspace_name);
          break;

        // 任务管理
        case 'list_jobs':
          result = await this.jobs!.listJobs();
          break;

        case 'stop_job':
          result = await this.jobs!.stopJob(params.job_id);
          break;

        case 'get_job_stats':
          result = await this.jobs!.getJobStats();
          break;

        // 系统
        case 'get_version':
          result = await this.client!.getVersion();
          break;

        case 'get_stats':
          result = await this.client!.getStats();
          break;

        default:
          result = {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          tool: this.name,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tool: this.name,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get input schema for validation
   */
  getInputSchema(): z.ZodSchema {
    return z.object({
      action: z.enum([
        'search_modules', 'get_module_info', 'get_module_options', 'execute_exploit', 'execute_auxiliary', 'get_module_stats',
        'list_sessions', 'get_session', 'execute_command', 'kill_session', 'get_session_stats',
        'list_workspaces', 'set_workspace', 'create_workspace', 'list_hosts', 'list_services', 'list_vulnerabilities', 'list_credentials', 'get_workspace_stats',
        'list_jobs', 'stop_job', 'get_job_stats',
        'get_version', 'get_stats',
      ]),
      query: z.string().optional(),
      module_name: z.string().optional(),
      session_id: z.number().optional(),
      command: z.string().optional(),
      workspace_name: z.string().optional(),
      options: z.record(z.any()).optional(),
      job_id: z.number().optional(),
    });
  }
}
