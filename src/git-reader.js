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

function isGitRepo(path) {
  try {
    const result = execFileSync('git', ['rev-parse', '--git-dir'], {
      cwd: path, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    return result === '.git' || result.endsWith('/.git') || result === 'HEAD'
  } catch {
    return false
  }
}

function parseCommits(raw) {
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, ...rest] = line.split(' ')
    const msg = rest.join(' ')
    return { hash: hash?.slice(0, 8), message: msg, repo: null }
  })
}

function getSinceDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  // Back to start of that day
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function groupByTheme(commits) {
  const themes = {}
  for (const commit of commits) {
    const match = commit.message.match(/^(feat|fix|chore|docs|test|refactor|style|perf|ci|build|revert)(\(.+?\))?:?\s*/i)
    const theme = match ? match[1].toLowerCase() : 'other'
    if (!themes[theme]) themes[theme] = []
    themes[theme].push(commit)
  }
  return themes
}

export async function readGitActivity(repoPaths, opts = {}) {
  const { author, days = 1 } = opts
  const since = getSinceDate(days)
  const allCommits = []
  const allFiles = new Set()
  const allBranches = []
  const repoResults = []

  for (const rawPath of repoPaths) {
    const repoPath = resolve(rawPath)
    if (!existsSync(repoPath) || !isGitRepo(repoPath)) continue

    const repoName = repoPath.split('/').pop()

    // Get commits since N days ago, filtered by author if provided
    const logArgs = [
      'log', `--since=${since}`, '--oneline', '--no-merges',
      ...(author ? [`--author=${author}`] : [])
    ]
    const rawCommits = gitExec(logArgs, repoPath)
    const commits = parseCommits(rawCommits).map(c => ({ ...c, repo: repoName }))
    allCommits.push(...commits)

    // Get files changed in those commits
    if (commits.length > 0) {
      const diffArgs = ['diff', '--name-only', `HEAD~${Math.min(commits.length, 20)}`, 'HEAD']
      const rawFiles = gitExec(diffArgs, repoPath)
      if (rawFiles) rawFiles.split('\n').filter(Boolean).forEach(f => allFiles.add(`${repoName}/${f}`))
    }

    // Get current branch + recently touched branches
    const currentBranch = gitExec(['branch', '--show-current'], repoPath)
    if (currentBranch) allBranches.push({ repo: repoName, branch: currentBranch, current: true })

    const recentBranches = gitExec([
      'for-each-ref', '--sort=-committerdate', '--format=%(refname:short) %(committerdate:relative)',
      'refs/heads', '--count=5'
    ], repoPath)

    if (recentBranches) {
      recentBranches.split('\n').filter(Boolean).forEach(line => {
        const parts = line.split(' ')
        const branch = parts[0]
        if (branch && branch !== currentBranch) {
          allBranches.push({ repo: repoName, branch, current: false })
        }
      })
    }

    // Detect PR-style branch naming (feature/*, fix/*, etc.)
    const prBranches = allBranches
      .filter(b => b.repo === repoName && /^(feature|feat|fix|hotfix|release|chore)\//.test(b.branch))
      .map(b => b.branch)

    repoResults.push({
      repo: repoName,
      path: repoPath,
      commits,
      prBranches,
      currentBranch,
    })
  }

  const themes = groupByTheme(allCommits)

  return {
    commits: allCommits,
    filesChanged: [...allFiles],
    branches: allBranches,
    themes,
    repos: repoResults,
    summary: `${allCommits.length} commit${allCommits.length !== 1 ? 's' : ''} across ${repoResults.length} repo${repoResults.length !== 1 ? 's' : ''}`,
  }
}
