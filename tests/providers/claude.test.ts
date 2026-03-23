// tests/providers/claude.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ClaudeProvider } from '../../src/providers/claude.js';
import { execFile } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('ClaudeProvider', () => {
  it('has name "Claude"', () => {
    const provider = new ClaudeProvider();
    expect(provider.name).toBe('Claude');
  });

  it('calls claude CLI with correct args and parses JSON response', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, JSON.stringify({ result: 'test response' }), '');
      return {} as any;
    });

    const provider = new ClaudeProvider();
    const result = await provider.call('system prompt', 'user prompt');
    expect(result).toBe('test response');

    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p', 'user prompt', '--system-prompt', 'system prompt', '--output-format', 'json']),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('extracts model from modelUsage in JSON response', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, JSON.stringify({
        result: 'hello',
        modelUsage: { 'claude-opus-4-6': { inputTokens: 10 } },
      }), '');
      return {} as any;
    });

    const provider = new ClaudeProvider('opus');
    await provider.call('sys', 'user');
    expect(provider.lastModel).toBe('claude-opus-4-6');
  });

  it('passes --model flag when model is specified', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, JSON.stringify({ result: 'ok' }), '');
      return {} as any;
    });

    const provider = new ClaudeProvider('opus');
    await provider.call('sys', 'user');

    expect(mockExecFile).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--model', 'opus']),
      expect.any(Object),
      expect.any(Function),
    );
  });
});
