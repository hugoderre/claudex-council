import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

interface CodexModel {
  slug: string;
  display_name: string;
  description: string;
}

interface CodexModelsCache {
  models: CodexModel[];
}

async function getCodexModels(): Promise<{ slug: string; name: string; description: string }[]> {
  try {
    const cachePath = join(homedir(), '.codex', 'models_cache.json');
    const raw = await readFile(cachePath, 'utf-8');
    const data: CodexModelsCache = JSON.parse(raw);
    return data.models.map((m) => ({
      slug: m.slug,
      name: m.display_name,
      description: m.description,
    }));
  } catch {
    return [
      { slug: 'o3', name: 'o3', description: 'Could not read models cache' },
    ];
  }
}

// Claude Code uses aliases that map to full model IDs.
// These are the stable aliases — the CLI resolves them to the latest version.
const CLAUDE_MODELS = [
  { slug: 'sonnet', name: 'Claude Sonnet', description: 'Fast and capable (default)' },
  { slug: 'opus', name: 'Claude Opus', description: 'Most capable' },
  { slug: 'haiku', name: 'Claude Haiku', description: 'Fastest, lightweight' },
];

export async function listModels(): Promise<void> {
  console.log(chalk.bold('\n📋 Available Models\n'));

  console.log(chalk.bold.blue('  Claude Code (proposer):'));
  for (const m of CLAUDE_MODELS) {
    console.log(`    ${chalk.green(m.slug.padEnd(20))} ${chalk.dim(m.description)}`);
  }

  console.log();
  console.log(chalk.bold.yellow('  Codex CLI (critic):'));
  const codexModels = await getCodexModels();
  for (const m of codexModels) {
    console.log(`    ${chalk.green(m.slug.padEnd(20))} ${chalk.dim(m.description)}`);
  }

  console.log(chalk.dim('\n  Usage: claudex-council --claude-model opus --codex-model o3 "prompt"\n'));
}
