# RFC 02: An installable gpui app with a data folder chosen in its settings

Status: proposed (2026-10-21)

The gpui app runs today only through `just wordle-gpui`, from inside the repo. This RFC proposes two changes. The first lets the app run as a macOS `.app` installed in `/Applications`. The second adds a **Data folder** setting, so the app reads and writes its precomputed files in a folder the user chooses.

## Problem

The app finds `precompute-cache/` from a path written into the binary when it is compiled:

- `src/solver/matrix.rs:29` `default_dir()`, for the Feedback matrices (`feedback/`)
- `src/solver/guess_count_matrix.rs:51` `default_dir()`, for the Guess Count Matrix and its `summary.json` (`guess-counts/`)

Both take `env!("CARGO_MANIFEST_DIR")`, go up two folders to the repo root and append `precompute-cache/`. So:

- A binary built on one machine looks for the repo of that machine. It finds nothing on any other machine, or after the repo moves.
- The Solver panel, the Opener statistics, and both precompute commands then fail, or write into a folder that may not exist.
- The user can't keep the 38 MB of Feedback matrices and the 167 MB of Guess Count Matrices anywhere else, such as on an external disk or in a folder shared with another checkout.

The word lists are not affected: `engine/words.rs` builds them into the binary with `include_str!`.

There is also a smaller problem. The precompute log prints the fixed strings `MATRICES_FOLDER` and `GUESS_COUNTS_FOLDER` (`overlays/precompute_run.rs:26`), not the folder actually used.

## Goals

1. The app is built as `Wordle.app`, and works when copied to `/Applications` on any Mac, with no repo nearby.
2. The settings menu shows which **Data folder** is in use, and the user can change it. The choice is kept across launches.
3. Running from the repo (`just wordle-gpui`, `cargo test`) works as it does now, and still shares `precompute-cache/` with Python and the backend.
4. Every message the app shows about precomputed files names the folder actually used.

## Non-goals

- Making the Python package or the backend read the setting. They keep using the repo's `precompute-cache/`. See the open questions.
- Saving other settings (theme, sidebar width, live hints) between launches. The settings file proposed here can hold them later.
- Shipping precomputed files inside the `.app`.
- Distribution through the Mac App Store, Windows or Linux installers, or auto-update.

## Terms

- **Data folder**: the folder that holds `feedback/` and `guess-counts/`. Today this is always `<repo>/precompute-cache/`.
- **Settings file**: `settings.json` in the app's config folder. On macOS that is `~/Library/Application Support/wordle-gpui/settings.json`.

## Design

### 1. Where the Data folder comes from

A new module, `src/data_dir.rs`, resolves the Data folder once at startup, and again whenever the setting changes. It returns both the path and where the path came from (`Source`), so the menu can show it. It checks, in this order:

| Order | Source | When it applies |
|---|---|---|
| 1 | `WORDLE_DATA_DIR` environment variable | Set and not empty. This is for tests and scripts. While it is set, the menu shows the setting as locked. |
| 2 | `data_dir` in the settings file | The user chose a folder. |
| 3 | The repo's `precompute-cache/` | The compiled-in repo root still exists and contains `app/wordle-gpui/Cargo.toml`. This is how a development build behaves today. |
| 4 | `~/Library/Application Support/wordle-gpui/precompute-cache/` | Anything else, for example the installed app on a new Mac. The app creates the folder when it first writes to it. |

`matrix::default_dir()` and `guess_count_matrix::default_dir()` are replaced by `data_dir.join("feedback")` and `data_dir.join("guess-counts")`. The functions that already take a `dir` argument (`Matrix::load`, `build_with`, `guess_count_matrix::build`, `read_summary`) keep it. Only the callers in `ui/mod.rs` and `ui/solver_panel.rs`, and `opener_results::read`, change. The app passes them the folder held in `WordleApp`.

Step 3 keeps `CARGO_MANIFEST_DIR`, but only as one candidate, never as the only answer. A binary built on one machine and run on another skips step 3 and falls through to step 4.

### 2. The settings file

```json
{
  "version": 1,
  "data_dir": "/Volumes/Archive/wordle-cache"
}
```

- If `data_dir` is missing or `null`, the app falls through to the default (step 3 or 4).
- The app writes the file through a temporary file and a rename, so a crash never leaves half a file.
- If the file is unreadable or from a newer `version`, the app ignores it, starts with the default, and shows a warning in the status bar. It does not overwrite the file until the user changes a setting.
- The config folder comes from the `dirs` crate (`dirs::config_dir()`). That is `~/Library/Application Support` on macOS, `%APPDATA%` on Windows and `~/.config` on Linux, so builds for the other platforms work too.

### 3. The setting in the UI

The settings menu gets one new row, **Data folder…**, at the end of group 3 after the two precompute commands. On the right, in the menu's dim detail style, it shows the folder in use, shortened with `~` and cut in the middle when long, for example `~/…/wordle/precompute-cache`.

Clicking it opens a small panel, laid out like the seed field and with the same widgets:

```
Data folder
~/Documents/code/personal/wordle/precompute-cache        (repo default)
Feedback matrices ✓   Guess counts: 8 of 8 Strategies
[ Choose… ]  [ Show in Finder ]  [ Use default ]
```

- **Choose…** opens the system folder picker (`cx.prompt_for_paths` with `directories: true`, `files: false`, and the prompt "Use as data folder"). The app then checks the chosen folder (section 4) and saves it.
- **Show in Finder** calls `cx.reveal_path`. It is disabled when the folder doesn't exist yet.
- **Use default** removes `data_dir` from the settings file. It is disabled when no folder was chosen.
- The second line describes the folder's contents, using what the app already reads: whether the two `.npy` files exist in `feedback/`, and the Strategies that `summary.json` lists as finished. A new folder says "Empty: run Precompute matrices… to fill it".
- When the folder comes from `WORDLE_DATA_DIR`, all three buttons are disabled and the second line says "Set by WORDLE_DATA_DIR".

The command palette lists **Data folder…** too, and choosing it opens the same panel.

### 4. Checking a chosen folder

The app accepts a folder when:

- It exists and the app can write to it. The app checks this by creating and removing a file named `.wordle-write-test`.
- It is not inside the `.app` bundle.

The app then looks at what is already there:

- If it holds `feedback/` or `guess-counts/`, the app uses them as they are. The existing manifest check still refuses a version 1 Guess Count Matrix, or one built from other word lists, and says so in the precompute log.
- If it is empty, the app uses it. The precompute commands create `feedback/` and `guess-counts/` when they run.
- If it holds other files but neither subfolder, the app asks once: "This folder has other files in it. Use it for Wordle's data anyway?" Picking the parent of `precompute-cache/` by mistake is the case this catches. In that case the app offers the `precompute-cache/` inside it.

The app does not copy or move files from the old folder. Moving 200 MB without asking is a surprise, and the user can move the files in Finder. The panel's note says: "Files stay in the old folder."

### 5. Changing the folder while the app runs

- While a precompute runs, **Choose…** and **Use default** are disabled, with the note "Stop the precompute first". This avoids one run writing into two folders.
- After the change, the app:
  - drops the Feedback matrices the Solver panel has loaded, so the next ranking reads them from the new folder, and
  - reads `summary.json` again, so the Opener statistics and the "why there is none" note match the new folder.
- The Game on the board is not affected.

### 6. Messages name the real folder

`MATRICES_FOLDER` and `GUESS_COUNTS_FOLDER` become functions of the Data folder, shown with the home folder shortened to `~`. When the Data folder is the repo's `precompute-cache/`, they show it relative to the repo, as now (`precompute-cache/feedback/`), so the existing messages and their tests stay the same. The other cases get new tests.

### 7. Building the `.app`

The plan is to use `cargo-packager`, configured in `app/wordle-gpui/Cargo.toml`:

```toml
[package.metadata.packager]
product-name = "Wordle"
identifier = "com.altr.wordle-gpui"
icons = ["assets/icon.png"]
category = "PuzzleGame"
formats = ["app", "dmg"]
before-packaging-command = "cargo build --release"

[package.metadata.packager.macos]
minimum-system-version = "13.0"
```

It is chosen over `cargo-bundle` because it also builds a `.dmg`, and NSIS and `.deb` installers later, from the same configuration. cargo-bundle builds only the `.app`.

New `just` recipes:

```just
# Build Wordle.app and Wordle.dmg into app/wordle-gpui/target/release/packager/ (ad-hoc signed)
[working-directory: 'app/wordle-gpui']
bundle-gpui:
    cargo packager --release
    codesign --force --deep --sign - target/release/packager/Wordle.app

# Build Wordle.app and copy it to /Applications
install-gpui: bundle-gpui
    cp -R app/wordle-gpui/target/release/packager/Wordle.app /Applications/
```

- **Signing**: an ad-hoc signature (`--sign -`) is enough to run the app on the Mac that built it. Running it on other Macs without a Gatekeeper warning needs a Developer ID certificate, the hardened runtime and notarization (`xcrun notarytool submit --wait`, then `xcrun stapler staple`). That is left as an optional step, used when a `DEVELOPER_ID` variable is set.
- **Shaders**: the `runtime_shaders` feature already used means packaging, like building, needs only the Command Line Tools.
- **Network**: the sidebar's Oxford dictionary lookups use `ureq`. An unsandboxed, notarized app needs no network entitlement for that.
- **Icon**: there is none yet. A first icon can be one green Tile with a "W", made at 1024 × 1024 px.
- **Arguments**: `--answer`, `--seed` and `--unlimited` keep working when the binary inside the bundle is run from a terminal. Opening the app from Finder passes no arguments, which starts a normal Game.
- **Version**: the `.app` takes its version from `Cargo.toml` (`0.1.0`), and the About box shows it.

## Alternatives considered

- **Only an environment variable.** It is simple, but apps opened from Finder or the Dock don't see the shell's variables, so a user of the installed app couldn't set it. It is kept as the first step of the lookup for tests and scripts.
- **A command-line flag (`--data-dir`).** It has the same Finder problem. It could be added later if a script needs it.
- **Always using Application Support, and never the repo.** That breaks goal 3: a development build would stop sharing the precomputed files with Python and the backend.
- **Shipping the Feedback matrices in the bundle's `Resources/`.** That adds 38 MB to a download for something the app builds in about a second. The Guess Count Matrices (167 MB, about half an hour to build) could be offered later as a separate download.
- **Moving files when the folder changes.** This is rejected for the reasons in section 4.

## Testing

- `data_dir` resolution, one test for each row of the table in section 1. The environment and settings file are passed in, not read globally, so the tests can run in parallel.
- Reading the settings file: missing, empty, valid, unreadable and from a newer version. Writing it: through a temporary file in a temporary folder.
- Checking a chosen folder: one that exists and is writable, one that is read-only, one inside the bundle, one that is empty, one that holds `precompute-cache/`, and one that holds other files.
- Folder labels for the precompute log: the repo, home and other cases.
- By hand: build the app with `just install-gpui`, move the repo away, open the app from Launchpad, check that it uses Application Support, run **Precompute matrices…**, choose another folder, and restart the app to check that the choice was kept.

## Docs to update in the same change

- `docs/documents/gpui-app.md`: the Data folder setting and how it is resolved, the settings file, and `just bundle-gpui` and `just install-gpui`. Also update its line in `docs/documents/INDEX.md`.
- `GLOSSARY.md`: add **Data folder**, if it becomes a domain term rather than an implementation detail.
- `README.md`: how to install the app.

## Open questions

1. **Should Python and the backend also read `WORDLE_DATA_DIR`?** Then one variable would point all three at the same folder. It is cheap to add, but it touches `precompute.py`, `precompute_guess_counts.py`, `precompute_backup.py` and the backend's `common.py`.
2. **Should the installed app on a development Mac use the repo (step 3)?** As proposed, it does whenever the repo is still there, which keeps it in step with Python. The cost is that a `.app` behaves differently depending on whether the repo that built it is still on disk. The other option is to apply step 3 only when the binary is not inside a `.app`.
3. **Should the settings file now also save the theme, live hints and the panel layout?** That would be easy once the file exists. It is left out here to keep this change small.
4. **Is notarization worth the Apple Developer fee ($99 a year)?** That depends on whether the app will be given to anyone else.
