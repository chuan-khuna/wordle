"""The Benchmark and the Opener leaderboard, precomputed and saved as JSON.

A Benchmark plays every Answer with one Strategy, starting from that Strategy's
own best Opener, and counts the Guesses each Game took. The Guess Limit is six:
a Game that needs more is a Loss. Three Strategies are compared:

  1. Expected Information over All words (the Guess List)
  2. Expected Information over Candidates only
  3. Expected Candidates over All words

The Opener leaderboard ranks every Guess List word as a first Guess by
Expected Information over the whole Answer List.

Games are not played one by one. Every Answer that has got the same Feedback so
far shares a Candidate Set, and so the same next Guess, so the Answers are played
together as a tree: one `rank` call per node instead of one per Game. The results
are the same as playing each Game alone.
"""

import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from wordle_backend.feedback import WIN
from wordle_backend.matrices import DEFAULT_DIR
from wordle_backend.strategy import By, Pool, Scope, Strategy

BENCHMARK_FILE = "benchmark.json"
OPENERS_FILE = "openers.json"

GUESS_LIMIT = 6
SAFETY_LIMIT = 12  # no Strategy here needs more than 8 Guesses; this only stops a runaway
LEADERBOARD_SIZE = 500  # Openers saved


@dataclass(frozen=True)
class BenchmarkStrategy:
    """One Strategy of the Benchmark: how Guesses are chosen, and what to call it."""

    id: str
    name: str
    pool: Pool
    scope: Scope
    by: By


BENCHMARK_STRATEGIES = (
    BenchmarkStrategy("bits-all", "Expected Information, all words", "guesses", "global", "bits"),
    BenchmarkStrategy("bits-candidates", "Expected Information, Candidates only", "answers", "candidates", "bits"),
    BenchmarkStrategy("expected-all", "Expected Candidates, all words", "guesses", "global", "expected"),
)


def best_opener(strategy: Strategy, how: BenchmarkStrategy) -> str:
    return strategy.rank(
        strategy.all_candidates(), pool=how.pool, scope=how.scope, by=how.by, top=1
    )[0].word


def guess_counts(strategy: Strategy, how: BenchmarkStrategy, opener: str) -> dict[str, int]:
    """The Guess Count of every Answer: its Game played with `how`, starting from `opener`."""
    counts: dict[str, int] = {}
    # Each node is (Candidate Set, Guess to play). Every Answer in the set is still unsolved.
    pending = [(strategy.all_candidates(), opener, 1)]
    while pending:
        candidates, guess, number = pending.pop()
        row = strategy.guesses_vs_answers[strategy.guess_row[guess]]
        codes = row[candidates]
        for code in np.unique(codes):
            group = candidates[codes == code]
            if code == WIN:
                for i in group:
                    counts[strategy.answers[i]] = number
            elif number >= SAFETY_LIMIT:
                for i in group:
                    counts[strategy.answers[i]] = number + 1  # unsolved: a Loss anyway
            else:
                next_guess = strategy.rank(group, pool=how.pool, scope=how.scope, by=how.by, top=1)[0].word
                pending.append((group, next_guess, number + 1))
    return counts


def run_benchmark(strategy: Strategy, how: BenchmarkStrategy, answers: list[str] | None = None) -> dict:
    """The Benchmark of one Strategy: its Opener, Guess Distribution and Average Guess Count.

    `answers` limits the Games to a subset of the Answer List (for tests); default is all.
    """
    opener = best_opener(strategy, how)
    counts = guess_counts(strategy, how, opener)
    if answers is not None:
        counts = {answer: counts[answer] for answer in answers}
    distribution = [sum(1 for n in counts.values() if n == k) for k in range(1, GUESS_LIMIT + 1)]
    lost = sorted(answer for answer, n in counts.items() if n > GUESS_LIMIT)
    won = len(counts) - len(lost)
    total = sum(n * games for n, games in enumerate(distribution, start=1))
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
        "average_guess_count": total / won if won else None,
    }


def run_benchmarks(strategy: Strategy, threads: int = 1) -> list[dict]:
    """The Benchmark of every Strategy, in order. Threads help: numpy releases the GIL."""
    with ThreadPoolExecutor(max_workers=threads) as pool:
        return list(pool.map(lambda how: run_benchmark(strategy, how), BENCHMARK_STRATEGIES))


def opener_leaderboard(strategy: Strategy, size: int = LEADERBOARD_SIZE) -> list[dict]:
    """The best first Guesses by Expected Information (ties by Expected Candidates, then alphabetical)."""
    ranked = strategy.rank(strategy.all_candidates(), pool="guesses", scope="global", by="bits", top=size)
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


def save(benchmark: list[dict], openers: list[dict], directory: Path = DEFAULT_DIR) -> tuple[Path, Path]:
    directory.mkdir(parents=True, exist_ok=True)
    benchmark_path, openers_path = directory / BENCHMARK_FILE, directory / OPENERS_FILE
    benchmark_path.write_text(json.dumps({"guess_limit": GUESS_LIMIT, "strategies": benchmark}, indent=1) + "\n", encoding="utf-8")
    openers_path.write_text(json.dumps({"openers": openers}, indent=1) + "\n", encoding="utf-8")
    return benchmark_path, openers_path


def load(directory: Path = DEFAULT_DIR) -> tuple[dict | None, dict | None]:
    """(benchmark, openers) as saved, with None for a file that is missing."""
    def read(name: str) -> dict | None:
        path = directory / name
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    return read(BENCHMARK_FILE), read(OPENERS_FILE)
