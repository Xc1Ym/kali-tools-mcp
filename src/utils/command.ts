import { spawn } from 'child_process';
import { promisify } from 'util';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface CommandOptions {
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

/**
 * Execute a shell command with timeout and error handling
 */
export async function executeCommand(
  command: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  const { timeout = 300000 } = options; // 5 minutes default

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killed = false;

    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
    });

    // Set up timeout
    const timer = setTimeout(() => {
      timedOut = true;
      killed = true;
      child.kill('SIGTERM');

      // Force kill if SIGTERM doesn't work
      setTimeout(() => {
        if (child.pid) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeout);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: !killed && code === 0,
        stdout,
        stderr,
        exitCode: code,
        timedOut,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout,
        stderr: stderr + error.message,
        exitCode: null,
        timedOut,
      });
    });
  });
}

/**
 * Check if a command exists on the system
 */
export async function commandExists(command: string): Promise<boolean> {
  const result = await executeCommand('which', [command], { timeout: 5000 });
  return result.success && result.stdout.trim().length > 0;
}

/**
 * Validate command arguments to prevent injection
 */
export function sanitizeArgs(args: string[]): boolean {
  // Basic check for command injection patterns
  const dangerousPatterns = [
    /[;&|`$()]/, // Shell metacharacters
    /\.\./, // Path traversal
    /([^:])\/\//, // Double slashes (potential bypass) but allow protocol://
  ];

  for (const arg of args) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(arg)) {
        return false;
      }
    }
  }

  return true;
}
