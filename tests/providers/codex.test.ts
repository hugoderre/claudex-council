import { describe, it, expect, vi } from 'vitest';
import { CodexProvider } from '../../src/providers/codex.js';
import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

describe('CodexProvider', () => {
  it('has name "Codex"', () => {
    const provider = new CodexProvider();
    expect(provider.name).toBe('Codex');
  });

  it('calls codex exec with correct args and reads output file', async () => {
    const mockExecFile = vi.mocked(execFile);
    const mockReadFile = vi.mocked(readFile);
    const mockUnlink = vi.mocked(unlink);

    mockExecFile.mockImplementation((_cmd, args, _opts, callback: any) => {
      callback(null, '', '');
      return {} as any;
    });
    mockReadFile.mockResolvedValue('codex response');
    mockUnlink.mockResolvedValue();

    const provider = new CodexProvider();
    const result = await provider.call('system prompt', 'user prompt');
    expect(result).toBe('codex response');

    const callArgs = mockExecFile.mock.calls[0][1] as string[];
    expect(callArgs).toContain('exec');
    expect(callArgs).toContain('--full-auto');
    expect(callArgs).toContain('-o');
    // Verify -o is followed by a temp file path
    const oIndex = callArgs.indexOf('-o');
    expect(callArgs[oIndex + 1]).toMatch(/codex-council-/);
  });
});
