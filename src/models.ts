import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { execFile } from 'node:child_process';

interface CodexModel {
  slug: string;
  display_name: string;
  description: string;
}

interface CodexModelsCache {
  models: CodexModel[];
}

async function getCodexModels(): Promise<{ slug: string; description: string }[]> {
  try {
    const cachePath = join(homedir(), '.codex', 'models_cache.json');
    const raw = await readFile(cachePath, 'utf-8');
    const data: CodexModelsCache = JSON.parse(raw);
    return data.models.map((m) => ({
      slug: m.slug,
      description: m.description,
    }));
  } catch {
    return [];
  }
}

async function getCodexDefaultModel(): Promise<string> {
  try {
    const configPath = join(homedir(), '.codex', 'config.toml');
    const raw = await readFile(configPath, 'utf-8');
    const match = raw.match(/^model\s*=\s*"([^"]+)"/m);
    return match?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function getClaudeModels(): Promise<{ alias: string; fullId: string; description: string }[]> {
  const aliases = [
    { alias: 'sonnet', description: 'Fast and capable' },
    { alias: 'opus', description: 'Most capable' },
    { alias: 'haiku', description: 'Fastest, lightweight' },
  ];

  // Resolve aliases to full model IDs by querying Claude CLI
  const resolved = await Promise.all(
    aliases.map(async (a) => {
      const fullId = await resolveClaudeModel(a.alias);
      return { ...a, fullId };
    }),
  );

  return resolved;
}

function resolveClaudeModel(alias: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      'claude',
      ['-p', 'hi', '--model', alias, '--output-format', 'json', '--max-turns', '1'],
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve(alias);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          const models = Object.keys(parsed.modelUsage ?? {});
          resolve(models[0] ?? alias);
        } catch {
          resolve(alias);
        }
      },
    );
  });
}

export async function listModels(): Promise<void> {
  console.log(chalk.bold('\n📋 Available Models\n'));

  console.log(chalk.bold.blue('  Claude Code (proposer):'));
  console.log(chalk.dim('  Resolving model versions...\n'));

  const [claudeModels, codexModels, codexDefault] = await Promise.all([
    getClaudeModels(),
    getCodexModels(),
    getCodexDefaultModel(),
  ]);

  // Detect Claude default (sonnet is the Claude Code default)
  const claudeDefault = 'sonnet';

  for (const m of claudeModels) {
    const isDefault = m.alias === claudeDefault;
    const label = `${m.alias} → ${m.fullId}`;
    const suffix = isDefault ? chalk.cyan(' (default)') : '';
    console.log(`    ${chalk.green(label.padEnd(35))} ${chalk.dim(m.description)}${suffix}`);
  }

  console.log();
  console.log(chalk.bold.yellow('  Codex CLI (critic):'));

  for (const m of codexModels) {
    const isDefault = m.slug === codexDefault;
    const suffix = isDefault ? chalk.cyan(' (default)') : '';
    console.log(`    ${chalk.green(m.slug.padEnd(25))} ${chalk.dim(m.description)}${suffix}`);
  }

  console.log(chalk.dim('\n  Usage: claudex-council --claude-model opus --codex-model gpt-5.4 "prompt"\n'));
}
