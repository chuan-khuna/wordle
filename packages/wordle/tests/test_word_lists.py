from importlib.resources import files
from pathlib import Path

import pytest

GPUI_DATA = Path(__file__).resolve().parents[3] / "app" / "wordle-gpui" / "data"  # the gpui app's own copy


@pytest.mark.parametrize("name", ["answers.txt", "guesses.txt"])
def test_the_gpui_app_has_the_same_word_lists(name):
    assert files("wordle").joinpath("data", name).read_bytes() == (GPUI_DATA / name).read_bytes()
