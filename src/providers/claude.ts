import { spawn } from 'node:child_process';
import type { LLMProvider } from './types.js';

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes — long rounds with Opus need time

function execClaudeStream(
  args: string[],
  stdinData: string,
  onChunk?: (text: string) => void,
): Promise<{ result: string; model: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', args, {
      timeout: DEFAULT_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let lastResult = '';
    let lastModel = 'unknown';

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;

      if (onChunk) {
        // Parse JSONL lines for streaming
        for (const line of chunk.split('\n')) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'assistant' && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === 'text' && block.text) {
                  onChunk(block.text);
                }
              }
            }
            if (event.type === 'result') {
              lastResult = event.result ?? '';
              const modelUsage = event.modelUsage ?? {};
              lastModel = Object.keys(modelUsage)[0] ?? 'unknown';
            }
          } catch {
            // Not JSON or incomplete line — ignore
          }
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('error', (error) => {
      reject(new Error(`Claude CLI failed: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI failed (exit ${code}):\n${stderr}`));
        return;
      }

      if (onChunk) {
        // Already parsed via streaming
        resolve({ result: lastResult, model: lastModel });
      } else {
        // Non-streaming: parse JSON result
        try {
          const parsed = JSON.parse(stdout);
          const model = Object.keys(parsed.modelUsage ?? {})[0] ?? 'unknown';
          resolve({ result: parsed.result ?? stdout, model });
        } catch {
          resolve({ result: stdout.trim(), model: 'unknown' });
        }
      }
    });

    proc.stdin.write(stdinData);
    proc.stdin.end();
  });
}

export class ClaudeProvider implements LLMProvider {
  name = 'Claude';

  constructor(private model?: string) {}

  async call(
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (text: string) => void,
  ): Promise<string> {
    const streaming = !!onChunk;
    const args = [
      '-p', '-',
      '--system-prompt', systemPrompt,
      '--output-format', streaming ? 'stream-json' : 'json',
      ...(streaming ? ['--verbose'] : []),
      ...(this.model ? ['--model', this.model] : []),
    ];

    try {
      const { result, model } = await execClaudeStream(args, userPrompt, onChunk)
        .catch(() => execClaudeStream(args, userPrompt, onChunk));
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
