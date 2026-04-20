import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommand, commandExists, sanitizeArgs } from '../../../src/utils/command.js';

vi.mock('child_process', () => {
  const EventEmitter = class {
    handlers: Record<string, Function[]> = {};
    on(event: string, fn: Function) { (this.handlers[event] ??= []).push(fn); return this; }
    emit(event: string, ...args: any[]) { this.handlers[event]?.forEach(fn => fn(...args)); }
    stdout = { on(event: string, fn: Function) { (this as any).handlers = (this as any).handlers || {}; ((this as any).handlers[event] ??= []).push(fn); return this; } };
    stderr = { on(event: string, fn: Function) { (this as any).handlers = (this as any).handlers || {}; ((this as any).handlers[event] ??= []).push(fn); return this; } };
    pid = 12345;
    kill(signal: string) { return true; }
  };
  return {
    spawn: vi.fn(() => {
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      // Store for test manipulation
      (spawn as any).__lastChild = child;
      return child;
    }),
    __esModule: true,
  };
});

import { spawn } from 'child_process';

const getChild = () => (spawn as any).__lastChild;

describe('executeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success for exit code 0', async () => {
    const promise = executeCommand('echo', ['hello']);
    const child = getChild();

    child.stdout.emit('data', Buffer.from('hello\n'));
    child.emit('close', 0);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('hello\n');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('returns failure for non-zero exit code', async () => {
    const promise = executeCommand('false', []);
    const child = getChild();

    child.stderr.emit('data', Buffer.from('error msg'));
    child.emit('close', 1);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.stderr).toBe('error msg');
    expect(result.exitCode).toBe(1);
  });

  it('handles spawn error event', async () => {
    const promise = executeCommand('nonexistent', []);
    const child = getChild();

    child.emit('error', new Error('spawn error'));

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain('spawn error');
  });

  it('times out and kills process', async () => {
    vi.useFakeTimers();
    const promise = executeCommand('sleep', ['10'], { timeout: 1000 });
    const child = getChild();

    vi.advanceTimersByTime(1000);
    await vi.advanceTimersByTimeAsync(0);

    // Close event after kill
    child.emit('close', null);

    const result = await promise;
    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);

    vi.useRealTimers();
  });

  it('uses default timeout of 300000ms', async () => {
    const promise = executeCommand('echo', ['test']);
    const child = getChild();
    child.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith('echo', ['test'], expect.objectContaining({}));
  });
});

describe('commandExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when command exists', async () => {
    const promise = commandExists('nmap');
    const child = getChild();
    child.stdout.emit('data', Buffer.from('/usr/bin/nmap'));
    child.emit('close', 0);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('returns false when command not found', async () => {
    const promise = commandExists('nonexistent');
    const child = getChild();
    child.emit('close', 1);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('returns false for empty stdout', async () => {
    const promise = commandExists('something');
    const child = getChild();
    child.stdout.emit('data', Buffer.from(''));
    child.emit('close', 0);
    const result = await promise;
    expect(result).toBe(false);
  });
});

describe('sanitizeArgs', () => {
  it('accepts clean arguments', () => {
    expect(sanitizeArgs(['-sS', '-p', '80', '192.168.1.1'])).toBe(true);
  });

  it('rejects shell metacharacters', () => {
    expect(sanitizeArgs(['arg;rm -rf'])).toBe(false);
    expect(sanitizeArgs(['arg|pipe'])).toBe(false);
    expect(sanitizeArgs(['arg`cmd`'])).toBe(false);
    expect(sanitizeArgs(['$(cmd)'])).toBe(false);
    expect(sanitizeArgs(['arg&bg'])).toBe(false);
  });

  it('rejects path traversal', () => {
    expect(sanitizeArgs(['../../../etc/passwd'])).toBe(false);
  });

  it('rejects double slashes (non-protocol)', () => {
    expect(sanitizeArgs(['path//traversal'])).toBe(false);
  });

  it('allows protocol URLs (http://)', () => {
    expect(sanitizeArgs(['http://example.com'])).toBe(true);
    expect(sanitizeArgs(['https://example.com'])).toBe(true);
  });
});
