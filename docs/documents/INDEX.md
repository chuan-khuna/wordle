# Implementation documents

How this project is built. Domain terms are defined in [GLOSSARY.md](../../GLOSSARY.md).

- [Architecture](architecture.md): the uv workspace, the `wordle` package's modules and layers, how to run, build and test it.
- [Feedback scoring](feedback-scoring.md): the two-pass rule that gives each letter its Mark, with repeated-letter examples.
- [Game and State](game-and-state.md): the `Game`, `Guess` and `State` classes, guess validation, Seeds, the Guess Limit, Win and Loss, and trying words after a Game ends.
- [Terminal UI](terminal-ui.md): the questionary menus, the rich board and keyboard, the share grid, replaying a Game by its Seed, and how to drive the UI from a script.
- [gpui desktop app](gpui-app.md): the Rust + gpui window in `app/wordle-gpui/`: its module layout (engine, solver, overlays, ui), the Solver panel with its Feedback Split chart, the settings menu and command palette, live hints, the sidebar's Oxford dictionary lookups, how to run it with `just`, and how its Seeds match the Python game.
- [Feedback matrices](feedback-matrices.md): the precomputed Answer × Answer and Guess × Answer Feedback matrices, their cell encoding, why `.npy`, and how Python and the gpui app regenerate them.
- [Solver Strategy](solver-strategy.md): how the Solver scores Guesses by Expected Information and Expected Candidates from the matrices, its pool and scope options, and how it differs from the reference project.
