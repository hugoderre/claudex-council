import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LLMProvider } from './types.js';

const TIMEOUT_MS = 120_000;

function execCodex(args: string[], stdinData: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('codex', args, {
      timeout: TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      reject(new Error(`Codex CLI failed: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Codex CLI failed (exit ${code}):\n${stderr}`));
        return;
      }
      resolve();
    });

    // Pass prompt via stdin to avoid ARG_MAX limits
    proc.stdin.write(stdinData);
    proc.stdin.end();
  });
}

export class CodexProvider implements LLMProvider {
  name = 'Codex';

  constructor(private model?: string) {}

  async call(systemPrompt: string, userPrompt: string): Promise<string> {
    const outFile = join(tmpdir(), `codex-council-${randomUUID()}.txt`);
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const args = [
      'exec', '--full-auto', '--skip-git-repo-check',
      ...(this.model ? ['--model', this.model] : []),
      '-o', outFile, '-',
    ];

    try {
      try {
        await execCodex(args, fullPrompt);
      } catch {
        // 1 immediate retry per spec
        await execCodex(args, fullPrompt);
      }

      const content = await readFile(outFile, 'utf-8');
      return content.trim();
    } finally {
      await unlink(outFile).catch(() => {});
    }
  }
}
