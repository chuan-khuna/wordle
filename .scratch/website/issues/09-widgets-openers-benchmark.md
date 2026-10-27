# Widgets: Opener table and Benchmark chart

Status: done
Blocked by: 04, 07

Build Widgets 5 and 6 from `/api/openers` and `/api/benchmark`. Draw the Benchmark chart with TanStack Charts (`@tanstack/react-charts`), as the Split explorer does.

See [spec](../spec.md).

## Comments

Done. `OpenerTable` (sortable, `top`/`highlight`) and `BenchmarkChart` (grouped bars per Guess Count plus a Lost group, `strategies`) built on TanStack Charts with theme-role colours; shared `CHART_CLASS` and `useLoad` factored out. Sample Articles `sample-openers` (6) and `sample-benchmark` (7) added. Documented in `web-frontend.md`.
