# Implementation documents

How this project is built. Domain terms are defined in [GLOSSARY.md](../../GLOSSARY.md).

- [Architecture](architecture.md): the uv workspace, the `wordle` package's modules and layers, how to run, build and test it.
- [Feedback scoring](feedback-scoring.md): the two-pass rule that gives each letter its Mark, with repeated-letter examples.
- [Game and State](game-and-state.md): the `Game`, `Guess` and `State` classes, guess validation, Win and Loss, and trying words after a Game ends.
- [Terminal UI](terminal-ui.md): the questionary menus, the rich board and keyboard, the share grid, and how to drive the UI from a script.
