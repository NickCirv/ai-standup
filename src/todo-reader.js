import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve, join } from 'path'

function gitExec(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function getRecentlyModifiedFiles(repoPath, days = 1) {
  try {
    const since = new Date()
    since.setDate(since.getDate() - days)
    const raw = gitExec(['diff', '--name-only', `HEAD~1`, 'HEAD'], repoPath)
    const fromCommit = raw ? raw.split('\n').filter(Boolean) : []

    // Also get currently modified files
    const modified = gitExec(['diff', '--name-only'], repoPath)
    const fromModified = modified ? modified.split('\n').filter(Boolean) : []

    return [...new Set([...fromCommit, ...fromModified])]
  } catch {
    return []
  }
}

function scanFileTodos(filePath) {
  const results = []
  try {
    const content = readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, i) => {
      const match = line.match(/\b(TODO|FIXME|HACK|XXX|BUG)\b[:\s]*(.*)/i)
      if (match) {
        results.push({
          type: match[1].toUpperCase(),
          text: match[2].trim() || line.trim(),
          file: filePath,
          line: i + 1,
        })
      }
    })
  } catch {
    // Binary or unreadable file — skip
  }
  return results
}

function readTodoFiles(repoPath) {
  const todoFileNames = ['TODO', 'TODO.md', 'TODO.txt', '.todo', 'todo.txt', 'TASKS.md']
  const todos = []

  for (const name of todoFileNames) {
    const filePath = join(repoPath, name)
    if (!existsSync(filePath)) continue
    try {
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'))
      todos.push(...lines.map(l => ({
        type: 'TODO',
        text: l.replace(/^[-*[\]x\s]+/, '').trim(),
        file: name,
        line: null,
      })).filter(t => t.text))
    } catch {
      // Skip
    }
  }

  return todos
}

function getStagedFiles(repoPath) {
  const raw = gitExec(['diff', '--cached', '--name-only'], repoPath)
  return raw ? raw.split('\n').filter(Boolean) : []
}

function getInProgressWork(repoPath) {
  // Staged but not committed = active work
  const staged = getStagedFiles(repoPath)
  // Modified but unstaged = work in progress
  const raw = gitExec(['diff', '--name-only'], repoPath)
  const unstaged = raw ? raw.split('\n').filter(Boolean) : []
  return { staged, unstaged }
}

export async function readTodos(repoPath) {
  const absPath = resolve(repoPath)
  if (!existsSync(absPath)) return { todos: [], inProgress: [], staged: [] }

  const recentFiles = getRecentlyModifiedFiles(absPath)
  const todoFiles = readTodoFiles(absPath)

  // Scan recently modified code files for inline TODOs
  const inlineTodos = []
  const codeExts = /\.(js|ts|jsx|tsx|py|rb|php|go|rs|java|cs|c|cpp|h|vue|svelte|md)$/i
  for (const relFile of recentFiles.slice(0, 20)) {
    if (!codeExts.test(relFile)) continue
    const fullPath = join(absPath, relFile)
    if (existsSync(fullPath)) {
      inlineTodos.push(...scanFileTodos(fullPath))
    }
  }

  const { staged, unstaged } = getInProgressWork(absPath)

  return {
    todos: [...todoFiles, ...inlineTodos].slice(0, 15),
    inProgress: unstaged.slice(0, 10),
    staged: staged.slice(0, 10),
  }
}
