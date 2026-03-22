import type { Message } from './providers/types.js';

export function serializeHistory(messages: Message[]): string {
  if (messages.length === 0) return '';

  return messages
    .map((m) => {
      return `## Round ${m.round} — ${m.provider} (${m.role})\n\n${m.content}`;
    })
    .join('\n\n---\n\n');
}
