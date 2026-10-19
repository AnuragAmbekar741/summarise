import pytest

from evals.normalize import normalize


@pytest.mark.parametrize(
    ("text", "tokens"),
    [
        ("Precision, Recall!", ["precision", "recall"]),
        ("Don't stop.", ["dont", "stop"]),
        ("80%", ["80", "percent"]),
        ("eighty percent", ["80", "percent"]),
        ("chapter four", ["chapter", "4"]),
        ("twenty five", ["25"]),
        ("two hundred spam emails", ["200", "spam", "emails"]),
        ("one hundred and five", ["105"]),
        ("1,000 users", ["1000", "users"]),
        ("three thousand two hundred", ["3200"]),
        ("problem set three by Friday", ["problem", "set", "3", "by", "friday"]),
        ("one two three", ["1", "2", "3"]),
        ("and then", ["and", "then"]),
        ("one and two", ["1", "and", "2"]),
        ("the F1 score", ["the", "f1", "score"]),
        ("summarises", ["summarizes"]),
        ("normalisation organised", ["normalization", "organized"]),
    ],
)
def test_normalize(text: str, tokens: list[str]) -> None:
    assert normalize(text) == tokens


def test_digits_and_words_agree() -> None:
    assert normalize("If there were two hundred spam emails, recall is forty percent") == normalize(
        "If there were 200 spam emails, recall is 40%"
    )
