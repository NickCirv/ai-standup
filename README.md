<div align="center">
  <img src="banner.svg" alt="ai-standup" width="600" />
  <p><strong>Auto-generate your daily standup from local git signals — no AI API needed.</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/ai-standup"><img alt="npm" src="https://img.shields.io/npm/v/ai-standup?color=3B82F6"></a>
    <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-3B82F6"></a>
    <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-3B82F6">
  </p>
</div>

---

## Install

```bash
npm install -g ai-standup
```

Or run without installing:

```bash
npx ai-standup
```

---

## Quick Start

```bash
# Generate today's standup
ai-standup

# Specify your name (auto-detected from git config)
ai-standup --author "Nick Ashkar"

# Multiple repos
ai-standup --repo ~/projects/backend --repo ~/projects/frontend

# Slack format
ai-standup --format slack

# Copy to clipboard
ai-standup share
```

---

## Sample Output

```
  Daily Standup
  Friday, February 28, 2026
  Nick Ashkar

  Yesterday
    • Feature: add user authentication endpoint
      add JWT middleware
      add refresh token rotation
    • Bug fix: resolve session expiry edge case
    • 14 files touched

  Today
    • Working on: user profile page
    • Continue work on 3 staged files
    • TODO: add rate limiting to auth routes

  Blockers
    ~ Stale branch "feature/old-payments" — no commits in 12 days
```

---

## Slack Format

```
*Daily Standup*
_Nick Ashkar • Friday, February 28, 2026_

*Yesterday* :calendar:
• Feature: add user authentication endpoint
• Bug fix: resolve session expiry edge case

*Today* :rocket:
• Working on: user profile page
• Continue work on 3 staged files

*Blockers* :warning:
• :large_yellow_circle: Stale branch "feature/old-payments"
```

---

## All Commands

| Command | Description |
|---------|-------------|
| `ai-standup` | Generate today's standup |
| `ai-standup log [n]` | Show last N standups (default 7) |
| `ai-standup config` | View/set config |
| `ai-standup share` | Copy latest standup to clipboard |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--format` | `text`, `json`, `markdown`, `slack` | `text` |
| `--days <n>` | Lookback period in days | `1` |
| `--author <name>` | Filter commits by author | git config |
| `--repo <path>` | Repo path (repeatable for multi-repo) | cwd |
| `--no-color` | Disable color output | — |

### Config

```bash
# Set defaults so you never need to pass flags
ai-standup config --author "Nick Ashkar"
ai-standup config --format slack
ai-standup config --repo ~/projects/backend --repo ~/projects/frontend

# View current config
ai-standup config

# Reset
ai-standup config --reset
```

Config is stored at `~/.ai-standup.json`.

---

## Features

- **Zero API calls** — reads your local git history, no LLM required
- **Multi-repo** — aggregate commits across all your active projects
- **Smart grouping** — commits grouped by type (feat, fix, chore, etc.)
- **Blocker detection** — stale branches, merge conflicts, large uncommitted diffs
- **Todo scanning** — surfaces TODO/FIXME comments and common todo files
- **4 output formats** — text, slack, markdown, JSON
- **Clipboard** — `ai-standup share` copies directly for pasting
- **Standup log** — last 30 standups stored at `~/.ai-standup-log.json`

---

## License

MIT © 2026 [NickCirv](https://github.com/NickCirv)
