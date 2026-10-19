"""Text normalisation for scoring: case, punctuation and number words.

Whisper writes "80%" and "chapter 4"; a hand-corrected reference may say
"eighty percent" and "chapter four". Both normalise to the same tokens, so WER
counts recognition errors rather than formatting choices.
"""

import re

_UNITS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19,
}  # fmt: skip
_TENS = {
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}  # fmt: skip
_SCALES = {"hundred": 100, "thousand": 1_000, "million": 1_000_000}


def normalize(text: str) -> list[str]:
    text = text.lower().replace("%", " percent ")
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)  # 1,000 -> 1000
    text = re.sub(r"(?<=\d)\.(?=\d)", "point", text)  # 0.5 -> 0point5, kept as one token
    text = text.replace("'", "").replace("’", "")  # don't -> dont
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return [_us_spelling(w) for w in _merge_numbers(text.split())]


def _us_spelling(word: str) -> str:
    """summarises -> summarizes, normalisation -> normalization (applied to both sides)."""
    return re.sub(r"(?<=\w{2})is(e|es|ed|ing|ation|ations)$", r"iz\1", word)


def _merge_numbers(words: list[str]) -> list[str]:
    out: list[str] = []
    total = current = 0
    in_number = False

    def flush() -> None:
        nonlocal total, current, in_number
        if in_number:
            out.append(str(total + current))
        total = current = 0
        in_number = False

    for word in words:
        if word in _UNITS or word in _TENS:
            value = _UNITS.get(word, _TENS.get(word, 0))
            low = current % 100
            if in_number and low == 0 and (current or total):
                current += value  # "two hundred five", "one thousand twenty"
            elif in_number and word in _UNITS and low >= 20 and low % 10 == 0 and value < 10:
                current += value  # "twenty five"
            else:
                flush()
                current = value
            in_number = True
        elif word in _SCALES and in_number:
            scale = _SCALES[word]
            if scale == 100:
                current = (current or 1) * 100
            else:
                total += (current or 1) * scale
                current = 0
        elif word == "and" and in_number and current % 100 == 0 and (current or total):
            continue  # "one hundred and five"
        else:
            flush()
            out.append(word)
    flush()
    return out
