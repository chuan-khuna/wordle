## Agent skills

### Issue tracker

Issues and specs are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Implementation docs

Documents about how this project is implemented live in `docs/documents/` as `.md` or `.html` files. `docs/documents/INDEX.md` is the entry point: a bullet list with one link per document, each followed by a one-line summary. Read the index before working on an area. When you add, rename or remove a document, update the index in the same change, and keep documents in step with the code they describe.

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
