#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ClaudeProvider } from './providers/claude.js';
import { CodexProvider } from './providers/codex.js';
import { runCouncil, CouncilError } from './orchestrator.js';
import { buildTranscript, saveTranscript } from './transcript.js';
import { formatRoundHeader, formatFinalOutput, formatError } from './formatter.js';
import { checkPrerequisites } from './preflight.js';

const MAX_ROUNDS = 10;

async function savePartialTranscript(prompt: string, messages: import('./providers/types.js').Message[], outputDir: string): Promise<string> {
  const transcript = buildTranscript(prompt, messages, '⚠️ Session interrupted — no synthesis produced');
  return saveTranscript(transcript, outputDir);
}

const program = new Command()
  .name('claudex-council')
  .description('Orchestrate brainstorming between Claude Code and Codex CLI')
  .version('1.0.0')
  .argument('<prompt>', 'The question or topic to brainstorm')
  .option('-r, --rounds <n>', 'Number of exchange rounds', '3')
  .option('-s, --save-transcript', 'Save full transcript as markdown', false)
  .option('-o, --output <dir>', 'Transcript output directory', './transcripts')
  .option('-v, --verbose', 'Display each round in real-time', false)
  .action(async (prompt, opts) => {
    const parsedRounds = parseInt(opts.rounds, 10);
    const rounds = Math.min(parsedRounds, MAX_ROUNDS);

    if (parsedRounds > MAX_ROUNDS) {
      console.log(chalk.yellow(`⚠️ Rounds capped to maximum of ${MAX_ROUNDS}`));
    }

    if (isNaN(rounds) || rounds < 1) {
      console.error(formatError('--rounds must be a number between 1 and 10'));
      process.exit(1);
    }

    // Preflight: check CLIs are available
    try {
      await checkPrerequisites();
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }

    const proposer = new ClaudeProvider();
    const critic = new CodexProvider();
    const spinner = ora();

    // Handle SIGINT — save partial transcript and kill children
    process.on('SIGINT', async () => {
      spinner.fail('Interrupted');
      console.log(chalk.yellow('\nSaving partial transcript...'));
      try {
        const filepath = await savePartialTranscript(prompt, [], opts.output);
        console.log(chalk.dim(`Partial transcript saved to ${filepath}`));
      } catch { /* best effort */ }
      process.exit(130);
    });

    try {
      const result = await runCouncil({
        prompt,
        proposer,
        critic,
        rounds,
        verbose: opts.verbose,
        onRoundStart: (round, provider, role) => {
          if (round <= rounds) {
            spinner.start(formatRoundHeader(round, rounds, provider, role));
          } else {
            spinner.start('📝 Generating final synthesis...');
          }
        },
        onRoundEnd: (round, response) => {
          spinner.succeed();
          if (opts.verbose && round <= rounds) {
            console.log(chalk.dim(`\n${response}\n`));
          }
        },
      });

      console.log(formatFinalOutput(result.synthesis));

      if (opts.saveTranscript) {
        const transcript = buildTranscript(prompt, result.messages, result.synthesis);
        const filepath = await saveTranscript(transcript, opts.output);
        console.log(chalk.dim(`\nTranscript saved to ${filepath}`));
      }
    } catch (error) {
      spinner.fail();
      // Force-save partial transcript even if --save-transcript is off
      const partialMessages = error instanceof CouncilError ? error.partialMessages : [];
      const filepath = await savePartialTranscript(prompt, partialMessages, opts.output);
      console.error(formatError((error as Error).message));
      console.error(chalk.dim(`Partial transcript saved to ${filepath}`));
      process.exit(1);
    }
  });

program.parse();
