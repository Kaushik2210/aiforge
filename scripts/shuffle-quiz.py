"""Spread the correct-answer positions of a quiz.yml evenly and check predict-output answers.

Usage: python scripts/shuffle-quiz.py content/<realm>/<quest>/quiz.yml

For question number i the correct option is moved to position i % 4 (other options keep their
order, `answer` and the `whyWrong` keys are rewritten to match). Because the target depends only
on the question's place in the file, running it twice gives the same file. Questions whose options
refer to each other ("all of the above", "both") are left alone. For every `predict-output`
question the code is run and its printed output must equal the correct option.
"""

import contextlib
import io
import sys

import yaml


class Literal(str):
    pass


def literal_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


yaml.add_representer(Literal, literal_representer)

REFERS = ("above", "both", "none of", "all of")


def main(path: str) -> int:
    with open(path, encoding="utf8") as f:
        items = yaml.safe_load(f)

    mismatches = 0
    for i, item in enumerate(items):
        options = list(item["options"])
        answer = int(item["answer"])
        if any(any(r in str(o).lower() for r in REFERS) for o in options):
            target = answer
        else:
            target = i % len(options)
        if target != answer:
            correct = options.pop(answer)
            options.insert(target, correct)
            old_why = {int(k): v for k, v in (item.get("whyWrong") or {}).items()}
            # map old indices to new ones
            order = [j for j in range(len(options)) if j != answer]  # old indices without the answer
            new_positions = [j for j in range(len(options)) if j != target]
            why = {str(new): old_why[old] for old, new in zip(order, new_positions) if old in old_why}
            item["options"] = options
            item["answer"] = target
            if why:
                item["whyWrong"] = why
        if item.get("kind") == "predict-output":
            buffer = io.StringIO()
            with contextlib.redirect_stdout(buffer):
                exec(compile(item["code"], f"<{item['id']}>", "exec"), {})
            printed = buffer.getvalue().strip()
            expected = str(item["options"][item["answer"]]).strip()
            ok = printed == expected
            print(("ok  " if ok else "BAD ") + f"{item['id']} -> {printed}" + ("" if ok else f"  (option says {expected})"))
            mismatches += 0 if ok else 1
        if isinstance(item.get("code"), str):
            item["code"] = Literal(item["code"])

    positions = {p: 0 for p in range(4)}
    for item in items:
        positions[item["answer"]] = positions.get(item["answer"], 0) + 1
    print("answer positions:", positions)
    with open(path, "w", encoding="utf8", newline="\n") as f:
        yaml.dump(items, f, sort_keys=False, allow_unicode=True, width=10_000, default_flow_style=False)
    print("predict-output mismatches:", mismatches)
    return 1 if mismatches else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
