// src/providers/claude.ts
import { execFile } from 'node:child_process';
import type { LLMProvider } from './types.js';

const TIMEOUT_MS = 120_000;

function execClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('claude', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Claude CLI failed: ${error.message}\n${stderr}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed.result ?? stdout);
      } catch {
        resolve(stdout.trim());
      }
    });
  });
}

export class ClaudeProvider implements LLMProvider {
  name = 'Claude';

  async call(systemPrompt: string, userPrompt: string): Promise<string> {
    const args = [
      '-p', userPrompt,
      '--system-prompt', systemPrompt,
      '--output-format', 'json',
    ];

    try {
      return await execClaude(args);
    } catch (error) {
      // 1 immediate retry per spec
      return await execClaude(args);
    }
  }
}
