import { spawn } from 'node:child_process';
import type { LLMProvider } from './types.js';

const TIMEOUT_MS = 120_000;

interface ClaudeResponse {
  result: string;
  modelUsage?: Record<string, unknown>;
}

function execClaude(args: string[], stdinData: string): Promise<{ result: string; model: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', args, {
      timeout: TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      reject(new Error(`Claude CLI failed: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI failed (exit ${code}):\n${stderr}`));
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

    // Pass prompt via stdin to avoid ARG_MAX limits
    proc.stdin.write(stdinData);
    proc.stdin.end();
  });
}

export class ClaudeProvider implements LLMProvider {
  name = 'Claude';

  constructor(private model?: string) {}

  async call(systemPrompt: string, userPrompt: string): Promise<string> {
    const args = [
      '-p', '-',
      '--system-prompt', systemPrompt,
      '--output-format', 'json',
      ...(this.model ? ['--model', this.model] : []),
    ];

    try {
      const { result, model } = await execClaude(args, userPrompt).catch(() => execClaude(args, userPrompt));
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
