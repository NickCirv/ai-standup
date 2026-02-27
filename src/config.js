import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'

const CONFIG_PATH = join(homedir(), '.ai-standup.json')

const DEFAULTS = {
  author: null,
  repos: [],
  format: 'text',
  lookbackDays: 1,
}

export function readConfig() {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULTS }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeConfig(updates) {
  const current = readConfig()
  const next = { ...current, ...updates }
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8')
  return next
}

export function getAuthor(overrideAuthor) {
  if (overrideAuthor) return overrideAuthor

  const config = readConfig()
  if (config.author) return config.author

  try {
    return execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

export function getDefaultRepos() {
  const config = readConfig()
  if (config.repos && config.repos.length > 0) return config.repos

  // Fall back to current working directory
  return [process.cwd()]
}

export function printConfig() {
  const config = readConfig()
  return config
}
