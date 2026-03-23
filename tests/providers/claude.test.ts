import { describe, it, expect, vi } from 'vitest';
import { ClaudeProvider } from '../../src/providers/claude.js';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { Writable, Readable } from 'node:stream';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

function createMockProcess(stdout: string, code = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = new Readable({ read() { this.push(stdout); this.push(null); } });
  proc.stderr = new Readable({ read() { this.push(null); } });
  proc.stdin = new Writable({ write(_chunk: any, _enc: any, cb: any) { cb(); } });
  setTimeout(() => proc.emit('close', code), 10);
  return proc;
}

describe('ClaudeProvider', () => {
  it('has name "Claude"', () => {
    const provider = new ClaudeProvider();
    expect(provider.name).toBe('Claude');
  });

  it('calls claude CLI and parses JSON response via stdin', async () => {
    const mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ result: 'test response' })));

    const provider = new ClaudeProvider();
    const result = await provider.call('system prompt', 'user prompt');
    expect(result).toBe('test response');

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p', '-', '--system-prompt', 'system prompt', '--output-format', 'json']),
      expect.any(Object),
    );
  });

  it('extracts model from modelUsage in JSON response', async () => {
    const mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({
      result: 'hello',
      modelUsage: { 'claude-opus-4-6': { inputTokens: 10 } },
    })));

    const provider = new ClaudeProvider('opus');
    await provider.call('sys', 'user');
    expect(provider.lastModel).toBe('claude-opus-4-6');
  });

  it('passes --model flag when model is specified', async () => {
    const mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ result: 'ok' })));

    const provider = new ClaudeProvider('opus');
    await provider.call('sys', 'user');

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--model', 'opus']),
      expect.any(Object),
    );
  });
});
