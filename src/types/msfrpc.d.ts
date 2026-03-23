declare module 'msfrpc' {
  export interface MsfRpcConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    uri?: string;
  }

  export class MsfRpc {
    constructor(config: MsfRpcConfig);
    login(): Promise<void>;
    call(method: string, ...args: any[]): Promise<any>;
  }
}
