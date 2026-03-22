import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LLMProvider } from './types.js';

const TIMEOUT_MS = 120_000;

function execCodex(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('codex', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`Codex CLI failed: ${error.message}\n${stderr}`));
        return;
      }
      resolve();
    });
  });
}

export class CodexProvider implements LLMProvider {
  name = 'Codex';

  async call(systemPrompt: string, userPrompt: string): Promise<string> {
    const outFile = join(tmpdir(), `codex-council-${randomUUID()}.txt`);
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const args = ['exec', '--full-auto', '-o', outFile, fullPrompt];

    try {
      try {
        await execCodex(args);
      } catch {
        // 1 immediate retry per spec
        await execCodex(args);
      }

      const content = await readFile(outFile, 'utf-8');
      return content.trim();
    } finally {
      await unlink(outFile).catch(() => {});
    }
  }
}
