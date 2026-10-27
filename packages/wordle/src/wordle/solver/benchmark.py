"""The Benchmark and the Opener leaderboard, precomputed and saved as JSON for the website.

A Benchmark plays every Answer with one Strategy, starting from that Strategy's
own best Opener, and counts the Guesses each Game took. The Guess Limit is six:
a Game that needs more is a Loss. All eight Strategies of
`wordle.solver.strategy` are compared: each Ranking (Expected Information or
Expected Candidates) with each Guess Pool (the Answer List or the Guess List)
and each Search Scope (Candidates only or All words).

The Opener leaderboard ranks every Guess List word as a first Guess by
Expected Information over the whole Answer List.

Games are not played one by one: `wordle.solver.guess_counts` plays every Answer
together as a tree, which gives the same results as playing each Game alone.
"""

import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from wordle.engine.game import MAX_GUESSES as GUESS_LIMIT
from wordle.solver.guess_counts import guess_counts
from wordle.solver.matrix import CACHE_DIR
from wordle.solver.strategy import STRATEGIES, Solver, Strategy

BENCHMARK_DIR = CACHE_DIR / "benchmark"
BENCHMARK_FILE = "benchmark.json"
OPENERS_FILE = "openers.json"

LEADERBOARD_SIZE = 500  # Openers saved


def best_opener(solver: Solver, how: Strategy) -> str:
    """The Strategy's Opener: ranked over the whole Guess Pool, whatever its Search Scope."""
    return solver.rank(solver.all_candidates(), pool=how.pool, scope="global", by=how.by, top=1)[0].word


def run_benchmark(solver: Solver, how: Strategy, answers: list[str] | None = None) -> dict:
    """The Benchmark of one Strategy: its Opener, Guess Distribution and Average Guess Count.

    `answers` limits the Games to a subset of the Answer List (for tests); default is all.
    """
    opener = best_opener(solver, how)
    by_answer = dict(zip(solver.answers, guess_counts(solver, how, opener).tolist()))
    counts = by_answer if answers is None else {answer: by_answer[answer] for answer in answers}
    distribution = [sum(1 for n in counts.values() if n == k) for k in range(1, GUESS_LIMIT + 1)]
    lost = sorted(answer for answer, n in counts.items() if n > GUESS_LIMIT)
    return {
        "id": how.id,
        "name": how.name,
        "pool": how.pool,
        "scope": how.scope,
        "by": how.by,
        "opener": opener,
        "games": len(counts),
        "distribution": distribution,
        "losses": len(lost),
        "lost_answers": lost,
        # Every Game counts, a Loss at the Guess Count it needed, as in the Guess Count Matrix.
        "average_guess_count": sum(counts.values()) / len(counts),
    }


def run_benchmarks(solver: Solver, threads: int = 1) -> list[dict]:
    """The Benchmark of every Strategy, in order. Threads help: numpy releases the GIL."""
    with ThreadPoolExecutor(max_workers=threads) as pool:
        return list(pool.map(lambda how: run_benchmark(solver, how), STRATEGIES))


def opener_leaderboard(solver: Solver, size: int = LEADERBOARD_SIZE) -> list[dict]:
    """The best first Guesses by Expected Information (ties by Expected Candidates, then alphabetical)."""
    ranked = solver.rank(solver.all_candidates(), pool="guesses", scope="global", by="bits", top=size)
    return [
        {
            "rank": rank,
            "word": s.word,
            "bits": s.bits,
            "expected_candidates": s.expected_candidates,
            "groups": s.groups,
            "largest_group": s.largest_group,
            "is_candidate": s.is_candidate,
        }
        for rank, s in enumerate(ranked, start=1)
    ]


def save(benchmark: list[dict], openers: list[dict], directory: Path = BENCHMARK_DIR) -> tuple[Path, Path]:
    directory.mkdir(parents=True, exist_ok=True)
    benchmark_path, openers_path = directory / BENCHMARK_FILE, directory / OPENERS_FILE
    benchmark_path.write_text(json.dumps({"guess_limit": GUESS_LIMIT, "strategies": benchmark}, indent=1) + "\n", encoding="utf-8")
    openers_path.write_text(json.dumps({"openers": openers}, indent=1) + "\n", encoding="utf-8")
    return benchmark_path, openers_path


def load(directory: Path = BENCHMARK_DIR) -> tuple[dict | None, dict | None]:
    """(benchmark, openers) as saved, with None for a file that is missing."""
    def read(name: str) -> dict | None:
        path = directory / name
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    return read(BENCHMARK_FILE), read(OPENERS_FILE)
