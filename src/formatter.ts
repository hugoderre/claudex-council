// src/formatter.ts
import chalk from 'chalk';

export function formatRoundHeader(round: number, totalRounds: number, provider: string, role: string): string {
  const icon = role === 'proposer' ? '💡' : role === 'critic' ? '🔍' : '📝';
  return `${icon} Round ${round}/${totalRounds} — ${provider} (${role})`;
}

export function formatSynthesisHeader(): string {
  return '📝 Generating final synthesis...';
}

export function formatFinalOutput(synthesis: string): string {
  const separator = chalk.bold('═'.repeat(60));
  return `\n${separator}\n\n${synthesis}\n\n${separator}`;
}

export function formatError(message: string): string {
  return chalk.red(`\n❌ Error: ${message}`);
}
