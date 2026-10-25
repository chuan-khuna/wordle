# YouTube slides (Slidev)

The Thai YouTube video of the Series is presented from a [Slidev](https://sli.dev/) deck in `app/slidev/`: about 28 minutes in 14 scenes that follow the eleven Articles. The slides carry the visuals (Tiles, the key figures, short tables); the script is in each slide's presenter notes. Every number is from the Thai Articles (`app/frontend/content/th/articles/`); when an Article's figures change, change the slide and its notes with it.

## Running it

- `just slides` (`bun run dev` in `app/slidev/`) serves the deck on http://localhost:3030 and opens it. Press **P** (or open `/presenter`) for the presenter view: the notes, the next slide and a timer. Arguments go to `slidev`, e.g. `just slides present --port 3031`.
- `just slides build` writes a static site to `app/slidev/dist/` (gitignored).
- For the links on the slides to work, run the website too (`just web`).

The project has its own `package.json`, `bun.lock`, and the 7-day minimum release age in `bunfig.toml` and `.npmrc`. It does not share `node_modules` with `app/frontend/`. `@slidev/cli export` (PDF or PNG) also needs `playwright-chromium`, which is not installed.

## Layout

| File | What it holds |
| --- | --- |
| `slides.md` | The deck. The headmatter sets the default theme, light colours, 16:9, and the fonts (Noto Sans Thai Looped, IBM Plex Mono, loaded from Google Fonts). The first slide's notes are the checklist before recording; the last slide is the YouTube chapter list. Neither is in the video. |
| `style.css` | Rosé Pine Dawn, the website's default theme, as CSS variables (`--correct`, `--present`, `--absent` and so on, copied from `app/frontend/src/app/themes.css`), plus the `.stat` figure-and-label and `.board` classes. |
| `components/Tiles.vue` | A Guess as Tiles: `<Tiles word="crane" marks="00102" />`. `marks` takes one digit per letter, as the backend sends them (0 Absent, 1 Present, 2 Correct); leave it out for blank Tiles. `size` is `sm`, `md` (default) or `lg`. |
| `components/Word.vue` | A word in a mono box, as the Articles set words in prose: `<Word>tarse</Word>`. |
| `components/Open.vue` | A link to the website in a new tab: `<Open href="/th/articles/rules">`. `href` is a path on the site; the site is `VITE_SITE_URL`, default `http://localhost:3000`. Most links carry a Widget's URL params and `#widget-<id>`, so the Widget opens in the state the scene needs. |

## Notes format

Each slide's notes (the HTML comment at its end) start with `⏱ ฉาก <n> · <start> – <end> · <title>`, the scene's planned place in the video. A scene that spans two slides says (ครึ่งแรก) or (ครึ่งหลัง). Then come **บนจอ** (what to click on the website) and **พูด** (the lines). A `[click]` marker in the lines is where the next `v-click` on the slide appears. The presenter view highlights the lines up to the current click.
