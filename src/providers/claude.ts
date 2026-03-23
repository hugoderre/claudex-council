// src/providers/claude.ts
import { execFile } from 'node:child_process';
import type { LLMProvider } from './types.js';

const TIMEOUT_MS = 120_000;

interface ClaudeResponse {
  result: string;
  modelUsage?: Record<string, unknown>;
}

function execClaude(args: string[]): Promise<{ result: string; model: string }> {
  return new Promise((resolve, reject) => {
    execFile('claude', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Claude CLI failed: ${error.message}\n${stderr}`));
        return;
      }
      try {
        const parsed: ClaudeResponse = JSON.parse(stdout);
        const model = Object.keys(parsed.modelUsage ?? {})[0] ?? 'unknown';
        resolve({ result: parsed.result ?? stdout, model });
      } catch {
        resolve({ result: stdout.trim(), model: 'unknown' });
      }
    });
  });
}

export class ClaudeProvider implements LLMProvider {
  name = 'Claude';

  constructor(private model?: string) {}

  async call(systemPrompt: string, userPrompt: string): Promise<string> {
    const args = [
      '-p', userPrompt,
      '--system-prompt', systemPrompt,
      '--output-format', 'json',
      ...(this.model ? ['--model', this.model] : []),
    ];

    try {
      const { result, model } = await execClaude(args).catch(() => execClaude(args));
      this._lastModel = model;
      return result;
    } catch (error) {
      throw error;
    }
  }

  get lastModel(): string | undefined {
    return this._lastModel;
  }

  private _lastModel?: string;
}
