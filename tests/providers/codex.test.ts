import { describe, it, expect, vi } from 'vitest';
import { CodexProvider } from '../../src/providers/codex.js';
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { Writable, Readable } from 'node:stream';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

function createMockProcess(code = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = new Readable({ read() { this.push(null); } });
  proc.stderr = new Readable({ read() { this.push(null); } });
  proc.stdin = new Writable({ write(_chunk: any, _enc: any, cb: any) { cb(); } });
  setTimeout(() => proc.emit('close', code), 10);
  return proc;
}

describe('CodexProvider', () => {
  it('has name "Codex"', () => {
    const provider = new CodexProvider();
    expect(provider.name).toBe('Codex');
  });

  it('calls codex exec with correct args and reads output file', async () => {
    const mockSpawn = vi.mocked(spawn);
    const mockReadFile = vi.mocked(readFile);
    const mockUnlink = vi.mocked(unlink);

    mockSpawn.mockReturnValue(createMockProcess());
    mockReadFile.mockResolvedValue('codex response');
    mockUnlink.mockResolvedValue();

    const provider = new CodexProvider();
    const result = await provider.call('system prompt', 'user prompt');
    expect(result).toBe('codex response');

    const callArgs = mockSpawn.mock.calls[0][1] as string[];
    expect(callArgs).toContain('exec');
    expect(callArgs).toContain('--full-auto');
    expect(callArgs).toContain('--skip-git-repo-check');
    expect(callArgs).toContain('-o');
    expect(callArgs).toContain('-');
    // Verify -o is followed by a temp file path
    const oIndex = callArgs.indexOf('-o');
    expect(callArgs[oIndex + 1]).toMatch(/codex-council-/);
  });
});
