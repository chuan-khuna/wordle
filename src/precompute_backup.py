"""`just cache backup` and `just cache restore`: keep the slow precomputed files in git, xz-compressed.

`precompute-cache/` is gitignored and is where every tool reads and writes. `backup` compresses each of its
folders (except the Feedback matrices, which take about a second to build again) into `data/precompute/`, one
`<file>.xz` per file, subfolders kept (`guess-counts/bits/<file>.xz`), so the folder can be committed. `restore`
puts them back into `precompute-cache/`. A backup of a version 1 Guess Count Matrix folder (flat files) restores
as it was; `just precompute migrate` then turns it into version 2.
"""

import argparse
import json
import lzma
import shutil
import sys
from pathlib import Path

import questionary

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "precompute-cache"
BACKUP_DIR = ROOT / "data" / "precompute"
SKIPPED = ("feedback",)  # Feedback matrices: `just precompute feedback` rebuilds them in about a second
SUFFIX = ".xz"
PRESET = 6  # xz's default; 9 made the Guess Count Matrices only about 3% smaller


def folders(parent: Path) -> list[Path]:
    """The folders of `parent` worth backing up, sorted."""
    if not parent.is_dir():
        return []
    return sorted(p for p in parent.iterdir() if p.is_dir() and p.name not in SKIPPED and not p.name.startswith("."))


def unfinished(folder: Path) -> list[str]:
    """Why a Guess Count Matrix folder is not finished, one line per Strategy; empty when it is (or has no summary).

    A Strategy's rows are its Guess Pool's words in a version 2 manifest (`rows` maps each Pool to them), or the
    one list of a version 1 manifest.
    """
    summary_path, manifest_path = folder / "summary.json", folder / "manifest.json"
    if not summary_path.exists() or not manifest_path.exists():
        return []
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    summary = json.loads(summary_path.read_text(encoding="utf-8"))

    def rows(id: str) -> int:
        if isinstance(manifest["rows"], list):  # version 1: every matrix has every Guess List row
            return len(manifest["rows"])
        return len(manifest["rows"][manifest["strategies"][id]["pool"]])

    return [
        f"{id}: {entry['complete_rows']:,} of {rows(id):,} Openers complete"
        for id, entry in summary.items()
        if entry["complete_rows"] < rows(id)
    ]


def files(folder: Path, pattern: str = "*") -> list[Path]:
    """The files under `folder` matching `pattern`, subfolders included, sorted."""
    return sorted(p for p in folder.rglob(pattern) if p.is_file())


def confirm(question: str, yes: bool) -> bool:
    return yes or bool(questionary.confirm(question, default=False).ask())


def size(path: Path) -> str:
    return f"{path.stat().st_size / 1_000_000:.1f} MB"


def backup(args: argparse.Namespace) -> None:
    sources = [f for f in folders(CACHE_DIR) if not args.folder or f.name in args.folder]
    if not sources:
        sys.exit(f"Nothing to back up in {CACHE_DIR.relative_to(ROOT)}/.")
    for source in sources:
        if (reasons := unfinished(source)) and not args.partial:
            lines = "\n".join(f"  {reason}" for reason in reasons)
            sys.exit(f"{source.name} is not finished:\n{lines}\nFinish it first, or run again with --partial.")
    names = ", ".join(f.name for f in sources)
    if not confirm(f"Replace the backup of {names} in {BACKUP_DIR.relative_to(ROOT)}/?", args.yes):
        return
    for source in sources:
        target = BACKUP_DIR / source.name
        shutil.rmtree(target, ignore_errors=True)  # no stale files from an older backup
        target.mkdir(parents=True)
        for file in files(source):
            packed = target / file.relative_to(source).with_name(file.name + SUFFIX)
            packed.parent.mkdir(parents=True, exist_ok=True)
            with lzma.open(packed, "wb", preset=PRESET) as out, file.open("rb") as raw:
                shutil.copyfileobj(raw, out)
            print(f"{packed.relative_to(ROOT)} ({size(file)} -> {size(packed)})")
    print("Done. Commit data/precompute/ to keep it.")


def restore(args: argparse.Namespace) -> None:
    sources = [f for f in folders(BACKUP_DIR) if not args.folder or f.name in args.folder]
    if not sources:
        sys.exit(f"Nothing to restore in {BACKUP_DIR.relative_to(ROOT)}/.")
    existing = [f.name for f in sources if any((CACHE_DIR / f.name).glob("*"))]
    if existing and not confirm(f"{', '.join(existing)} already in {CACHE_DIR.relative_to(ROOT)}/. Overwrite?", args.yes):
        return
    for source in sources:
        target = CACHE_DIR / source.name
        shutil.rmtree(target, ignore_errors=True)  # a half-built run there would not match the restored manifest
        target.mkdir(parents=True)
        for packed in files(source, "*" + SUFFIX):
            file = target / packed.relative_to(source).with_name(packed.name.removesuffix(SUFFIX))
            file.parent.mkdir(parents=True, exist_ok=True)
            with lzma.open(packed, "rb") as raw, file.open("wb") as out:
                shutil.copyfileobj(raw, out)
            print(f"{file.relative_to(ROOT)} ({size(file)})")
    print("Done. The Feedback matrices are not backed up: run `just precompute feedback` (or the gpui app's Precompute matrices…).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Back up precompute-cache/ into data/precompute/, or restore it.")
    commands = parser.add_subparsers(dest="command", required=True)
    for name, run, help in (
        ("backup", backup, "compress precompute-cache/ into data/precompute/"),
        ("restore", restore, "decompress data/precompute/ into precompute-cache/"),
    ):
        command = commands.add_parser(name, help=help)
        command.set_defaults(run=run)
        command.add_argument("--folder", action="append", help="only this folder, e.g. guess-counts (repeatable)")
        command.add_argument("--yes", action="store_true", help="replace without asking")
        if name == "backup":
            command.add_argument("--partial", action="store_true", help="back up a Guess Count Matrix not yet finished")
    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
