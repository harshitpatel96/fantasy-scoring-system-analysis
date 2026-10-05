#!/usr/bin/env python3
"""Compare two season folders (e.g. committed data vs. a fresh build) row by row.

Exits non-zero if fewer than 99% of the committed rows are reproduced exactly, which
catches derivation bugs and MoneyPuck column changes while tolerating small data corrections.
"""
import json
import sys
from pathlib import Path

KEYS = {
    "goalies.json": lambda d: (d["gameId"], d["name"], d["team"]),
    "skaters.json": lambda d: (d["g"], d["n"], d["p"], d["t"]),
}
THRESHOLD = 0.99


def main(old_dir, new_dir):
    ok = True
    for fname, key in KEYS.items():
        old = {key(d): d for d in json.loads((Path(old_dir) / fname).read_text())}
        new = {key(d): d for d in json.loads((Path(new_dir) / fname).read_text())}
        same = sum(1 for k, d in old.items() if new.get(k) == d)
        missing = [k for k in old if k not in new]
        changed = [k for k in old if k in new and new[k] != old[k]]
        added = len(new.keys() - old.keys())
        rate = same / len(old) if old else 1.0
        print(f"{fname}: {same:,}/{len(old):,} rows identical ({rate:.2%}), "
              f"{len(changed):,} changed, {len(missing):,} missing, {added:,} new")
        for k in changed[:5]:
            diff = {f: (old[k][f], new[k].get(f)) for f in old[k] if old[k][f] != new[k].get(f)}
            print(f"  changed {k}: {diff}")
        for k in missing[:5]:
            print(f"  missing {k}")
        ok &= rate >= THRESHOLD
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main(*sys.argv[1:3])
