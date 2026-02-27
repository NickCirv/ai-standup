import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

function gitExec(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function getDaysSinceDate(dateStr) {
  const then = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

function detectStaleBranches(repoPath, staleDays = 7) {
  const raw = gitExec([
    'for-each-ref',
    '--sort=committerdate',
    '--format=%(refname:short)|%(committerdate:iso8601)|%(committerdate:relative)',
    'refs/heads',
  ], repoPath)

  if (!raw) return []

  const currentBranch = gitExec(['branch', '--show-current'], repoPath)
  const blockers = []

  for (const line of raw.split('\n').filter(Boolean)) {
    const [branch, dateStr, relative] = line.split('|')
    if (!branch || branch === currentBranch) continue
    // Skip main/master/develop
    if (/^(main|master|develop|dev|staging|production)$/.test(branch)) continue

    const days = getDaysSinceDate(dateStr)
    if (days >= staleDays) {
      blockers.push({
        type: 'stale-branch',
        severity: days > 30 ? 'high' : 'medium',
        message: `Stale branch "${branch}" — no commits in ${relative}`,
        detail: branch,
      })
    }
  }

  return blockers
}

function detectMergeConflicts(repoPath) {
  const raw = gitExec(['diff', '--name-only', '--diff-filter=U'], repoPath)
  if (!raw) return []

  return raw.split('\n').filter(Boolean).map(file => ({
    type: 'merge-conflict',
    severity: 'high',
    message: `Unresolved merge conflict in ${file}`,
    detail: file,
  }))
}

function detectLargeUncommittedChanges(repoPath, lineThreshold = 200) {
  const raw = gitExec(['diff', '--stat'], repoPath)
  if (!raw) return []

  const match = raw.match(/(\d+) insertion|(\d+) deletion/)
  if (!match) return []

  const lines = parseInt(match[1] || '0') + parseInt(match[2] || '0')
  if (lines > lineThreshold) {
    return [{
      type: 'large-diff',
      severity: 'medium',
      message: `Large uncommitted diff — ${lines} lines changed (consider committing in smaller chunks)`,
      detail: `${lines} lines`,
    }]
  }

  return []
}

function detectLongRunningBranch(repoPath, maxDays = 14) {
  const currentBranch = gitExec(['branch', '--show-current'], repoPath)
  if (!currentBranch || /^(main|master|develop|dev)$/.test(currentBranch)) return []

  const raw = gitExec([
    'log', '--format=%cd', '--date=iso8601', '-1',
    '--diff-filter=A', '--follow', '--', '.'
  ], repoPath)

  if (!raw) return []

  const days = getDaysSinceDate(raw.trim())
  if (days > maxDays) {
    return [{
      type: 'long-branch',
      severity: 'medium',
      message: `Branch "${currentBranch}" is ${days} days old — consider merging or rebasing`,
      detail: currentBranch,
    }]
  }

  return []
}

function detectCIFailures(repoPath) {
  // Check for local CI artifacts (GitHub Actions local output, etc.)
  const warnings = []

  // Look for lockfile conflicts
  const raw = gitExec(['diff', '--name-only'], repoPath)
  if (raw) {
    const files = raw.split('\n').filter(Boolean)
    const lockFiles = files.filter(f => /package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Gemfile\.lock/.test(f))
    if (lockFiles.length > 0) {
      warnings.push({
        type: 'lockfile-drift',
        severity: 'low',
        message: `Lockfile modified but not committed: ${lockFiles.join(', ')}`,
        detail: lockFiles.join(', '),
      })
    }
  }

  return warnings
}

export async function detectBlockers(repoPath) {
  const absPath = resolve(repoPath)
  if (!existsSync(absPath)) return { blockers: [], warnings: [] }

  const stale = detectStaleBranches(absPath)
  const conflicts = detectMergeConflicts(absPath)
  const largeDiff = detectLargeUncommittedChanges(absPath)
  const longBranch = detectLongRunningBranch(absPath)
  const ciIssues = detectCIFailures(absPath)

  const all = [...conflicts, ...stale, ...largeDiff, ...longBranch, ...ciIssues]

  const blockers = all.filter(b => b.severity === 'high')
  const warnings = all.filter(b => b.severity !== 'high')

  return { blockers, warnings }
}
