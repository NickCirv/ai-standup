#!/usr/bin/env node

import { program } from 'commander'
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'

import {
  readGitActivity,
  readTodos,
  detectBlockers,
  buildStandup,
  formatStandup,
  formatLog,
  readConfig,
  writeConfig,
  getAuthor,
  getDefaultRepos,
  printConfig,
} from '../src/index.js'

const STANDUPS_PATH = join(homedir(), '.ai-standup-log.json')

function loadStandupLog() {
  if (!existsSync(STANDUPS_PATH)) return []
  try {
    return JSON.parse(readFileSync(STANDUPS_PATH, 'utf8'))
  } catch {
    return []
  }
}

function saveStandupLog(standup) {
  const log = loadStandupLog()
  log.unshift(standup)
  // Keep last 30
  writeFileSync(STANDUPS_PATH, JSON.stringify(log.slice(0, 30), null, 2), 'utf8')
}

function resolveRepoPaths(cliRepos) {
  if (cliRepos && cliRepos.length > 0) return cliRepos.map(r => resolve(r))
  return getDefaultRepos().map(r => resolve(r))
}

async function generateStandup(opts) {
  const {
    format = 'text',
    days = 1,
    author: cliAuthor,
    repo: cliRepos,
    color = true,
  } = opts

  const author = getAuthor(cliAuthor)
  const repoPaths = resolveRepoPaths(cliRepos)

  if (repoPaths.length === 0) {
    console.error('No valid git repos found. Specify --repo <path> or configure with `ai-standup config`.')
    process.exit(1)
  }

  const [gitActivity, ...todoAndBlockers] = await Promise.all([
    readGitActivity(repoPaths, { author, days: parseInt(days) }),
    ...repoPaths.map(async p => ({
      todos: await readTodos(p),
      blockers: await detectBlockers(p),
    }))
  ])

  // Merge todos + blockers across repos
  const mergedTodos = {
    todos: todoAndBlockers.flatMap(r => r.todos?.todos || []),
    inProgress: todoAndBlockers.flatMap(r => r.todos?.inProgress || []),
    staged: todoAndBlockers.flatMap(r => r.todos?.staged || []),
  }

  const mergedBlockers = {
    blockers: todoAndBlockers.flatMap(r => r.blockers?.blockers || []),
    warnings: todoAndBlockers.flatMap(r => r.blockers?.warnings || []),
  }

  const standup = buildStandup(gitActivity, mergedTodos, mergedBlockers, {
    author,
    days: parseInt(days),
  })

  saveStandupLog(standup)

  const useColor = color && format === 'text'
  console.log(formatStandup(standup, format, useColor))
}

// CLI definition
program
  .name('ai-standup')
  .description('Generate your daily standup from local git signals — no API needed')
  .version('1.0.0')

// Default command: generate standup
program
  .option('-f, --format <type>', 'Output format: text | json | markdown | slack', 'text')
  .option('-d, --days <n>', 'Lookback period in days', '1')
  .option('-a, --author <name>', 'Filter commits by author name')
  .option('-r, --repo <path>', 'Repo path (can repeat for multi-repo)', (val, acc) => [...acc, val], [])
  .option('--no-color', 'Disable color output')
  .action(async (opts) => {
    await generateStandup(opts)
  })

// log subcommand
program
  .command('log [n]')
  .description('Show standups for the last N days (default: 7)')
  .option('-f, --format <type>', 'Output format: text | json | markdown | slack', 'text')
  .option('--no-color', 'Disable color output')
  .action((n, opts) => {
    const count = parseInt(n || '7')
    const log = loadStandupLog().slice(0, count)
    if (log.length === 0) {
      console.log('No standup history found. Run `ai-standup` to generate your first one.')
      return
    }
    const useColor = opts.color && opts.format === 'text'
    console.log(formatLog(log, opts.format, useColor))
  })

// config subcommand
program
  .command('config')
  .description('Show or set configuration')
  .option('--author <name>', 'Set default author name')
  .option('--format <type>', 'Set default output format')
  .option('--repo <path>', 'Add a default repo path', (val, acc) => [...acc, val], [])
  .option('--reset', 'Reset config to defaults')
  .action(async (opts) => {
    if (opts.reset) {
      writeConfig({
        author: null,
        repos: [],
        format: 'text',
        lookbackDays: 1,
      })
      console.log('Config reset.')
      return
    }

    const updates = {}
    if (opts.author) updates.author = opts.author
    if (opts.format) updates.format = opts.format
    if (opts.repo && opts.repo.length > 0) updates.repos = opts.repo.map(r => resolve(r))

    if (Object.keys(updates).length > 0) {
      const saved = writeConfig(updates)
      console.log('Config updated:')
      console.log(JSON.stringify(saved, null, 2))
    } else {
      const config = printConfig()
      console.log('Current config:')
      console.log(JSON.stringify(config, null, 2))
    }
  })

// share subcommand
program
  .command('share')
  .description('Copy the latest standup to clipboard')
  .option('-f, --format <type>', 'Format to copy: text | markdown | slack', 'slack')
  .action((opts) => {
    const log = loadStandupLog()
    if (log.length === 0) {
      console.log('No standup found. Run `ai-standup` first.')
      return
    }

    const latest = log[0]
    const output = formatStandup(latest, opts.format, false)

    try {
      // macOS
      execFileSync('pbcopy', [], { input: output, encoding: 'utf8' })
      console.log(`Standup copied to clipboard (${opts.format} format).`)
    } catch {
      try {
        // Linux (xclip)
        execFileSync('xclip', ['-selection', 'clipboard'], { input: output, encoding: 'utf8' })
        console.log(`Standup copied to clipboard (${opts.format} format).`)
      } catch {
        try {
          // Linux (xsel)
          execFileSync('xsel', ['--clipboard', '--input'], { input: output, encoding: 'utf8' })
          console.log(`Standup copied to clipboard (${opts.format} format).`)
        } catch {
          console.log('Could not access clipboard. Output:\n')
          console.log(output)
        }
      }
    }
  })

program.parse(process.argv)
