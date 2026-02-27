import chalk from 'chalk'

const ACCENT = chalk.hex('#3B82F6')
const DIM = chalk.dim
const BOLD = chalk.bold

// Text format (default, with chalk colors)
function formatText(standup, useColor = true) {
  const c = useColor ? { accent: ACCENT, bold: BOLD, dim: DIM } : {
    accent: s => s, bold: s => s, dim: s => s,
  }

  const lines = []

  lines.push('')
  lines.push(c.bold('  Daily Standup'))
  lines.push(c.dim(`  ${formatDate(standup.meta?.generatedAt)}`))
  if (standup.meta?.author && standup.meta.author !== 'unknown') {
    lines.push(c.dim(`  ${standup.meta.author}`))
  }
  lines.push('')

  // Yesterday
  lines.push(c.accent('  Yesterday'))
  for (const item of standup.yesterday) {
    lines.push(`    • ${item.text}`)
    for (const d of (item.detail || []).slice(0, 3)) {
      lines.push(c.dim(`      ${d}`))
    }
  }
  lines.push('')

  // Today
  lines.push(c.accent('  Today'))
  for (const item of standup.today) {
    lines.push(`    • ${item.text}`)
    for (const d of (item.detail || []).slice(0, 3)) {
      lines.push(c.dim(`      ${d}`))
    }
  }
  lines.push('')

  // Blockers
  lines.push(c.accent('  Blockers'))
  if (standup.blockers.length === 0) {
    lines.push(c.dim('    None'))
  } else {
    for (const item of standup.blockers) {
      const prefix = item.severity === 'blocker' ? '  !' : '  ~'
      lines.push(`    ${prefix} ${item.text}`)
    }
  }
  lines.push('')

  if (standup.meta?.repos?.length > 0) {
    lines.push(c.dim(`  Repos: ${standup.meta.repos.join(', ')}`))
    lines.push('')
  }

  return lines.join('\n')
}

// Slack format with emoji
function formatSlack(standup) {
  const lines = []

  lines.push('*Daily Standup*')
  if (standup.meta?.author && standup.meta.author !== 'unknown') {
    lines.push(`_${standup.meta.author} • ${formatDate(standup.meta.generatedAt)}_`)
  }
  lines.push('')

  lines.push('*Yesterday* :calendar:')
  for (const item of standup.yesterday) {
    lines.push(`• ${item.text}`)
  }
  lines.push('')

  lines.push('*Today* :rocket:')
  for (const item of standup.today) {
    lines.push(`• ${item.text}`)
  }
  lines.push('')

  lines.push('*Blockers* :warning:')
  if (standup.blockers.length === 0) {
    lines.push('• None :white_check_mark:')
  } else {
    for (const item of standup.blockers) {
      const emoji = item.severity === 'blocker' ? ':red_circle:' : ':large_yellow_circle:'
      lines.push(`• ${emoji} ${item.text}`)
    }
  }

  return lines.join('\n')
}

// Markdown format
function formatMarkdown(standup) {
  const lines = []

  lines.push(`# Daily Standup`)
  if (standup.meta?.author && standup.meta.author !== 'unknown') {
    lines.push(`> ${standup.meta.author} — ${formatDate(standup.meta.generatedAt)}`)
    lines.push('')
  }

  lines.push('## Yesterday')
  for (const item of standup.yesterday) {
    lines.push(`- ${item.text}`)
    for (const d of (item.detail || []).slice(0, 3)) {
      lines.push(`  - \`${d}\``)
    }
  }
  lines.push('')

  lines.push('## Today')
  for (const item of standup.today) {
    lines.push(`- ${item.text}`)
  }
  lines.push('')

  lines.push('## Blockers')
  if (standup.blockers.length === 0) {
    lines.push('- None')
  } else {
    for (const item of standup.blockers) {
      lines.push(`- ${item.severity === 'blocker' ? '**[BLOCKER]**' : '[WARNING]'} ${item.text}`)
    }
  }

  return lines.join('\n')
}

// JSON format
function formatJSON(standup) {
  return JSON.stringify(standup, null, 2)
}

export function formatStandup(standup, format = 'text', useColor = true) {
  switch (format) {
    case 'slack': return formatSlack(standup)
    case 'markdown': return formatMarkdown(standup)
    case 'json': return formatJSON(standup)
    default: return formatText(standup, useColor)
  }
}

export function formatLog(standups, format = 'text', useColor = true) {
  if (format === 'json') {
    return JSON.stringify(standups, null, 2)
  }

  return standups.map((s, i) => {
    const header = useColor
      ? ACCENT.bold(`\n  === Day ${i + 1}: ${formatDate(s.meta?.generatedAt)} ===`)
      : `\n=== Day ${i + 1}: ${formatDate(s.meta?.generatedAt)} ===`
    return header + '\n' + formatStandup(s, format, useColor)
  }).join('\n')
}

function formatDate(iso) {
  if (!iso) return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
