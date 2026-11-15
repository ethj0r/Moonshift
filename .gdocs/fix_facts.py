import json

fixes = {
    "content/01_vision.json": [
        ("across six shifts", "across twelve shifts"),
    ],
    "content/03_narrative.json": [
        ("covers the six shifts", "covers the twelve shifts"),
        ("the six shifts before the resupply window closes",
         "the twelve shifts before the resupply window closes"),
    ],
    "content/06_technical.json": [
        ("for 14 months", "for 9 months"),
        ("14 months to launch", "9 months to launch"),
        ("content lock in month 11", "content lock in month 7"),
    ],
}


def walk(value, pairs):
    if isinstance(value, str):
        for a, c in pairs:
            value = value.replace(a, c)
        return value
    if isinstance(value, list):
        return [walk(x, pairs) for x in value]
    if isinstance(value, dict):
        return {k: walk(v, pairs) for k, v in value.items()}
    return value


for path, pairs in fixes.items():
    d = json.load(open(path, encoding="utf-8"))
    before = json.dumps(d, ensure_ascii=False)
    d = walk(d, pairs)
    after = json.dumps(d, ensure_ascii=False)
    open(path, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    changed = sum(before.count(a) for a, _ in pairs)
    print(path, "occurrences", changed)
