from evals.fetch import vocabulary


def test_vocabulary_picks_repeated_rare_words() -> None:
    turns = [
        ("Instructor", "The eigenvalue tells us. Every eigenvalue matters, and the matrix too."),
        ("Instructor", "A matrix, a matrix, an eigenvalue. The determinant once."),
        ("Student", "Is the eigenvalue real? The the the the."),
    ]
    terms = vocabulary(turns)
    assert terms[0] == "eigenvalue"  # rare and said four times
    assert "determinant" not in terms  # said once
    assert "the" not in terms  # common


def test_vocabulary_is_capped() -> None:
    words = " ".join(f"zyxqterm{chr(97 + i)} zyxqterm{chr(97 + i)}" for i in range(26))
    assert len(vocabulary([("", words)], size=5)) == 5


def test_vocabulary_skips_contractions() -> None:
    turns = [("", "We couldn't, we couldn't, we wouldn't. Kinematics and kinematics.")]
    assert vocabulary(turns) == ["kinematics"]
