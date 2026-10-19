## Agent skills

### Issue tracker

Issues and specs are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Tools

### Python

Use `uv` for everything Python: `uv run <script>`, `uv add <pkg>`, `uv sync`. Don't call `python`, `pip`, or `venv` directly.

### Node

Use `bun` as the package manager (`bun install`, `bun add`, `bun run`). `npm` is available but use it only when bun can't do the job.

Whenever you set up a Node project or add a package manager config, set a minimum release age of 7 days for both tools, so freshly published (possibly compromised) versions are never installed:

- `bunfig.toml`:
  ```toml
  [install]
  minimumReleaseAge = 604800 # 7 days, in seconds
  ```
- `.npmrc` (needs npm >= 11.10):
  ```ini
  min-release-age=7
  ```
