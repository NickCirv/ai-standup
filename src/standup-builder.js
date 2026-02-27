export function buildStandup(gitActivity, todos, blockers, opts = {}) {
  const { author, days = 1 } = opts
  const now = new Date()

  // --- YESTERDAY ---
  const yesterdayItems = []

  // Group commits by theme
  for (const [theme, commits] of Object.entries(gitActivity.themes || {})) {
    if (commits.length === 0) continue
    const label = themeLabel(theme)
    const summary = commits.length === 1
      ? commits[0].message
      : `${commits.length} ${theme} changes`
    const repos = [...new Set(commits.map(c => c.repo).filter(Boolean))]
    yesterdayItems.push({
      text: label ? `${label}: ${summary}` : summary,
      detail: commits.map(c => c.message),
      repos,
    })
  }

  if (gitActivity.commits?.length > 0 && gitActivity.filesChanged?.length > 0) {
    yesterdayItems.push({
      text: `${gitActivity.filesChanged.length} file${gitActivity.filesChanged.length !== 1 ? 's' : ''} touched`,
      detail: gitActivity.filesChanged.slice(0, 8),
      repos: [],
    })
  }

  if (yesterdayItems.length === 0) {
    yesterdayItems.push({ text: 'No commits found in the lookback period', detail: [], repos: [] })
  }

  // --- TODAY ---
  const todayItems = []

  if (todos.staged?.length > 0) {
    todayItems.push({
      text: `Continue work on ${todos.staged.length} staged file${todos.staged.length !== 1 ? 's' : ''}`,
      detail: todos.staged,
    })
  }

  if (todos.inProgress?.length > 0) {
    todayItems.push({
      text: `${todos.inProgress.length} file${todos.inProgress.length !== 1 ? 's' : ''} with uncommitted changes`,
      detail: todos.inProgress,
    })
  }

  // Active todos
  const openTodos = todos.todos?.slice(0, 5) || []
  for (const todo of openTodos) {
    todayItems.push({
      text: `${todo.type}: ${todo.text}`,
      detail: todo.file ? [`${todo.file}${todo.line ? `:${todo.line}` : ''}`] : [],
    })
  }

  // Branch context
  const activeBranch = gitActivity.branches?.find(b => b.current)
  if (activeBranch) {
    const branchContext = branchToTask(activeBranch.branch)
    if (branchContext) {
      todayItems.unshift({ text: branchContext, detail: [`on branch ${activeBranch.branch}`] })
    }
  }

  if (todayItems.length === 0) {
    todayItems.push({ text: 'Continue active work', detail: [] })
  }

  // --- BLOCKERS ---
  const blockerItems = []

  for (const b of blockers.blockers || []) {
    blockerItems.push({ text: b.message, severity: 'blocker', detail: [] })
  }

  for (const w of blockers.warnings || []) {
    blockerItems.push({ text: w.message, severity: 'warning', detail: [] })
  }

  // --- META ---
  const meta = {
    generatedAt: now.toISOString(),
    author: author || 'unknown',
    lookbackDays: days,
    repos: gitActivity.repos?.map(r => r.repo) || [],
    commitCount: gitActivity.commits?.length || 0,
  }

  return {
    yesterday: yesterdayItems,
    today: todayItems,
    blockers: blockerItems,
    meta,
  }
}

function themeLabel(theme) {
  const map = {
    feat: 'Feature',
    fix: 'Bug fix',
    chore: 'Chore',
    docs: 'Docs',
    test: 'Tests',
    refactor: 'Refactor',
    style: 'Style',
    perf: 'Performance',
    ci: 'CI',
    build: 'Build',
    revert: 'Revert',
    other: '',
  }
  return map[theme] ?? ''
}

function branchToTask(branch) {
  // feature/add-login-page → "Working on: add login page"
  const match = branch.match(/^(?:feature|feat|fix|hotfix|chore|docs)\/(.+)$/)
  if (!match) return null
  const task = match[1].replace(/[-_]/g, ' ').replace(/\//g, ' > ')
  return `Working on: ${task}`
}
