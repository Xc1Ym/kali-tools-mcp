declare module 'msfrpc' {
  export interface MsfRpcOptions {
    user?: string;
    pass?: string;
    host?: string;
    port?: number;
    ssl?: boolean;
    token?: string;
    uri?: string;
  }

  export default class MsfRpc {
    constructor(uri?: string, options?: MsfRpcOptions);
    constructor(options?: MsfRpcOptions);
    login(): Promise<void>;
    call(method: string, ...args: any[]): Promise<any>;
  }
}
