import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Message } from './providers/types.js';

export function buildTranscript(prompt: string, messages: Message[], synthesis: string): string {
  const now = new Date();
  const date = now.toISOString().replace('T', ' ').slice(0, 16);
  const rounds = messages.length;

  let md = `# ClaudexCouncil Transcript\n`;
  md += `**Date:** ${date}\n`;
  md += `**Prompt:** "${prompt}"\n`;
  md += `**Rounds:** ${rounds}\n\n---\n\n`;

  for (const msg of messages) {
    md += `## Round ${msg.round} — ${msg.provider} (${msg.role})\n\n${msg.content}\n\n---\n\n`;
  }

  md += `## Final Synthesis\n\n${synthesis}\n`;

  return md;
}

export async function saveTranscript(content: string, outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const time = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHmmss
  const filename = `council-${date}-${time}.md`;
  const filepath = join(outputDir, filename);
  await writeFile(filepath, content, 'utf-8');
  return filepath;
}
