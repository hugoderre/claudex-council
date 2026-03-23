import type { Message } from './providers/types.js';

const RECENT_ROUNDS_FULL = 2;
const MAX_SUMMARY_LENGTH = 200;

function summarize(content: string): string {
  // Take first ~200 chars, cut at last sentence/newline boundary
  if (content.length <= MAX_SUMMARY_LENGTH) return content;
  const cut = content.slice(0, MAX_SUMMARY_LENGTH);
  const lastBreak = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('\n'));
  const summary = lastBreak > 100 ? cut.slice(0, lastBreak + 1) : cut;
  return summary.trim() + ' [...]';
}

export function serializeHistory(messages: Message[]): string {
  if (messages.length === 0) return '';

  if (messages.length <= RECENT_ROUNDS_FULL) {
    // Few enough to include everything
    return messages
      .map((m) => `## Round ${m.round} — ${m.provider} (${m.role})\n\n${m.content}`)
      .join('\n\n---\n\n');
  }

  // Split: summarize older rounds, keep recent in full
  const older = messages.slice(0, -RECENT_ROUNDS_FULL);
  const recent = messages.slice(-RECENT_ROUNDS_FULL);

  const olderSerialized = older
    .map((m) => `## Round ${m.round} — ${m.provider} (${m.role}) [summary]\n\n${summarize(m.content)}`)
    .join('\n\n---\n\n');

  const recentSerialized = recent
    .map((m) => `## Round ${m.round} — ${m.provider} (${m.role})\n\n${m.content}`)
    .join('\n\n---\n\n');

  return `${olderSerialized}\n\n---\n\n${recentSerialized}`;
}
