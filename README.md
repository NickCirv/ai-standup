<div align="center">

# ai-standup

**Generate your daily standup from git history, TODOs, and branches — no AI API needed**

[![License: MIT](https://img.shields.io/github/license/NickCirv/ai-standup?style=flat-square&labelColor=0B0A09)](LICENSE)
[![Node: >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&labelColor=0B0A09)](https://nodejs.org)

</div>

## Install

```bash
npx github:NickCirv/ai-standup
```

Or install globally:

```bash
npm install -g github:NickCirv/ai-standup
```

## Usage

```bash
npx github:NickCirv/ai-standup                    # generate today's standup (text)
npx github:NickCirv/ai-standup --format slack     # Slack-ready output
npx github:NickCirv/ai-standup --repo ./frontend --repo ./backend  # multi-repo
```

| Flag | Description |
|------|-------------|
| `-f, --format <type>` | Output format: `text` \| `slack` \| `markdown` \| `json` (default: `text`) |
| `-d, --days <n>` | Lookback period in days (default: `1`) |
| `-a, --author <name>` | Filter commits by author name |
| `-r, --repo <path>` | Repo path — repeat for multi-repo |
| `--no-color` | Disable color output |

### Subcommands

| Command | What it does |
|---------|--------------|
| `ai-standup` | Generate today's standup |
| `ai-standup log [n]` | Show last N standups (default: 7) |
| `ai-standup config` | Show or set author, repos, format |
| `ai-standup share` | Copy latest standup to clipboard |

## What it does

Reads your local git log, staged files, TODO/FIXME comments, and branch state. Groups commits by type (feat, fix, chore), detects blockers like stale branches and merge conflicts, and outputs a formatted standup in under a second — no API key, no network call, no LLM.

Standups are saved to `~/.ai-standup-log.json` (last 30 entries). `share` copies to clipboard via `pbcopy` (macOS) or `xclip`/`xsel` (Linux).

---

<sub>Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
