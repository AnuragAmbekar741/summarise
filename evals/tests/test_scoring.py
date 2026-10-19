import pytest

from evals.normalize import normalize
from evals.scoring import boundary_errors, count_phrase, vocabulary_recall, word_error_rate


def test_wer_counts_edits() -> None:
    result, alignment = word_error_rate(normalize("a b c d e"), normalize("a x c e"))
    assert result.substitutions == 1
    assert result.deletions == 1
    assert result.wer == pytest.approx(2 / 5)
    assert alignment[0].kind == "equal"


def test_wer_of_empty_hypothesis_is_one() -> None:
    result, alignment = word_error_rate(["a", "b"], [])
    assert result.wer == 1.0
    assert alignment[0].kind == "delete"


def test_wer_ignores_formatting() -> None:
    result, _ = word_error_rate(
        normalize("Precision is eighty percent."), normalize("precision is 80%")
    )
    assert result.wer == 0


def test_count_phrase() -> None:
    tokens = normalize("the f1 score and the F1 score again")
    assert count_phrase(tokens, normalize("F1 score")) == 2
    assert count_phrase(tokens, []) == 0


def test_vocabulary_recall_counts_occurrences() -> None:
    reference = normalize("precision then recall then precision again, and the ROC curve")
    hypothesis = normalize("precision then recall then position again, and the rock curve")
    terms = [normalize(t) for t in ["precision", "recall", "ROC curve", "AUC"]]

    recall, counts = vocabulary_recall(reference, hypothesis, terms)

    assert recall == pytest.approx(2 / 4)  # precision 1 of 2, recall 1 of 1, ROC curve 0 of 1
    assert {c.term: (c.in_reference, c.in_hypothesis) for c in counts}["precision"] == (2, 1)


def test_vocabulary_recall_without_terms_in_reference() -> None:
    assert vocabulary_recall(["a"], ["a"], [["zzz"]])[0] is None


def test_boundary_errors_finds_split_word_at_cut() -> None:
    # Chunk 1 ends "...mean of precision", chunk 2 repeats "precision and recall".
    reference = normalize("the harmonic mean of precision and recall today we")
    chunk1 = normalize("the harmonic mean of precision")
    chunk2 = normalize("precision and recall today we")
    _, alignment = word_error_rate(reference, chunk1 + chunk2)
    assert boundary_errors(alignment, [len(chunk1)]) == 1


def test_boundary_errors_ignores_errors_far_from_cuts() -> None:
    reference = normalize("one two three four five six seven eight nine ten")
    hypothesis = normalize("one tue three four five six seven eight nine ten")
    _, alignment = word_error_rate(reference, hypothesis)
    assert boundary_errors(alignment, [7]) == 0
    assert boundary_errors(alignment, [2]) == 1
