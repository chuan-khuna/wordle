# Curated skills

Agent skills collected from the internet, kept here so they can be installed with the [`skills` CLI](https://github.com/vercel-labs/skills).

## Layout

```
curated-skills/
└── skills/
    └── <name>/
        └── SKILL.md
```

The CLI discovers every `skills/<name>/SKILL.md` under the folder you pass it.

## Skills

| Skill | What it does |
| --- | --- |
| `technical-writing` | Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. For docs, RFCs, readmes, PR descriptions and commit messages. |
| `unslop` | Cuts AI tells from any writing. |

Both set `disable-model-invocation: true`, so the agent never loads them on its own. Run them explicitly with `/technical-writing` or `/unslop`. Remove that line from a skill's frontmatter to let the agent pick it up automatically.

## Install

Run from the repo root:

```sh
npx skills add ./curated-skills --list                    # show what's available
npx skills add ./curated-skills                           # choose interactively
npx skills add ./curated-skills --skill unslop            # install one skill
npx skills add ./curated-skills/skills/technical-writing  # or point at the skill folder
```

## Add a skill

1. Create `skills/<name>/SKILL.md`. Put any scripts or reference files the skill uses in the same folder.
2. Give `SKILL.md` frontmatter with a `name` that matches the folder name and a `description` that says when to use the skill:

   ```markdown
   ---
   name: <name>
   description: What it does. Use when ...
   ---
   ```

3. Read the whole skill before adding it. A skill is instructions the agent follows, and it may include scripts the agent runs.
4. Check that the CLI finds it: `npx skills add ./curated-skills --list`.
5. Add a row to the table above.
