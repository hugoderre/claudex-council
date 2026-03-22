// src/preflight.ts
import { execFile } from 'node:child_process';

function checkCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('which', [cmd], (error) => {
      resolve(!error);
    });
  });
}

export async function checkPrerequisites(): Promise<void> {
  const [hasClaude, hasCodex] = await Promise.all([
    checkCommand('claude'),
    checkCommand('codex'),
  ]);

  const missing: string[] = [];
  if (!hasClaude) missing.push('claude (install: npm install -g @anthropic-ai/claude-code)');
  if (!hasCodex) missing.push('codex (install: npm install -g @openai/codex)');

  if (missing.length > 0) {
    throw new Error(`Required CLI tools not found:\n${missing.map(m => `  - ${m}`).join('\n')}`);
  }
}
