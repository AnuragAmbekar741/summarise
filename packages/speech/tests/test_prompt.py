from speech.prompt import PREVIOUS_MAX_CHARS, VOCABULARY_MAX_CHARS, build_prompt


def test_vocabulary_then_previous_text() -> None:
    prompt = build_prompt(["precision", "recall"], "and that is the F1 score")
    assert prompt == "precision, recall. and that is the F1 score"


def test_empty_inputs_give_empty_prompt() -> None:
    assert build_prompt([], "") == ""
    assert build_prompt(["  ", ""], "   ") == ""


def test_vocabulary_is_capped_on_whole_terms() -> None:
    terms = [f"term{i:03d}" for i in range(200)]
    prompt = build_prompt(terms)
    assert len(prompt) <= VOCABULARY_MAX_CHARS
    assert prompt.endswith(".")
    assert all(t in terms for t in prompt.rstrip(".").split(", "))


def test_previous_text_keeps_tail_from_word_boundary() -> None:
    previous = "word " * 100 + "the last words here"
    prompt = build_prompt([], previous)
    assert len(prompt) <= PREVIOUS_MAX_CHARS
    assert prompt.endswith("the last words here")
    assert prompt.startswith("word")
