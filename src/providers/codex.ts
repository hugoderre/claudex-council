import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LLMProvider } from './types.js';

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

function execCodexStream(
  args: string[],
  stdinData: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('codex', args, {
      timeout: DEFAULT_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let streamedText = '';

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;

      if (onChunk) {
        for (const line of chunk.split('\n')) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'item.completed' && event.item?.text) {
              onChunk(event.item.text);
              streamedText = event.item.text;
            }
          } catch {
            // Not JSON or incomplete line
          }
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      reject(new Error(`Codex CLI failed: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Codex CLI failed (exit ${code}):\n${stderr}`));
        return;
      }
      resolve(streamedText || stdout.trim());
    });

    proc.stdin.write(stdinData);
    proc.stdin.end();
  });
}

function execCodexFile(args: string[], stdinData: string, outFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('codex', args, {
      timeout: DEFAULT_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      reject(new Error(`Codex CLI failed: ${error.message}`));
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Codex CLI failed (exit ${code}):\n${stderr}`));
        return;
      }
      try {
        const content = await readFile(outFile, 'utf-8');
        resolve(content.trim());
      } catch (err) {
        reject(new Error(`Failed to read Codex output: ${(err as Error).message}`));
      }
    });

    proc.stdin.write(stdinData);
    proc.stdin.end();
  });
}

export class CodexProvider implements LLMProvider {
  name = 'Codex';

  constructor(private model?: string) {}

  async call(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (text: string) => void,
  ): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    if (onChunk) {
      // Streaming mode: use --json for JSONL events
      const args = [
        'exec', '--full-auto', '--skip-git-repo-check', '--json',
        ...(this.model ? ['--model', this.model] : []),
        '-',
      ];

      try {
        return await execCodexStream(args, fullPrompt, onChunk)
          .catch(() => execCodexStream(args, fullPrompt, onChunk));
      } catch (error) {
        throw error;
      }
    } else {
      // Non-streaming: use -o for file output
      const outFile = join(tmpdir(), `codex-council-${randomUUID()}.txt`);
      const args = [
        'exec', '--full-auto', '--skip-git-repo-check',
        ...(this.model ? ['--model', this.model] : []),
        '-o', outFile, '-',
      ];

      try {
        try {
          return await execCodexFile(args, fullPrompt, outFile);
        } catch {
          return await execCodexFile(args, fullPrompt, outFile);
        }
      } finally {
        await unlink(outFile).catch(() => {});
      }
    }
  }
}
