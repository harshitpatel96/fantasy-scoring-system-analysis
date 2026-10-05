#!/usr/bin/env python3
"""Build the site's per-season JSON from MoneyPuck game-by-game data.

For each season it downloads MoneyPuck's per-team game-by-game files
(teamPlayerGameByGame/<season>/regular/{goalies,skaters}/<TEAM>.csv), derives the
fields the site uses, and writes data/<season>/goalies.json and skaters.json. It then
rewrites data/seasons.json from whatever season folders exist.

Usage:
  build_data.py                      # current season + any season missing from data/
  build_data.py --seasons all        # rebuild every season MoneyPuck has
  build_data.py --seasons 2023,2025  # specific seasons (start year: 2025 = 2025-26)
  build_data.py --raw-dir DIR        # read <DIR>/<season>/{goalies,skaters}/*.csv instead of downloading

Standard library only, so the GitHub Action needs no dependencies.
"""
import argparse
import csv
import datetime
import io
import json
import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

BASE_URL = "https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame"
FIRST_SEASON = 2008  # MoneyPuck's game-by-game data starts with 2008-09
USER_AGENT = "fantasy-scoring-system-analysis data refresh (github.com/harshitpatel96/fantasy-scoring-system-analysis)"
REQUEST_DELAY_S = 1.0  # be polite to MoneyPuck's servers

# Used only if a season's directory listing can't be read; missing teams just 404 and are skipped.
FALLBACK_TEAMS = [
    "ANA", "ARI", "ATL", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET", "EDM",
    "FLA", "LAK", "MIN", "MTL", "NJD", "NSH", "NYI", "NYR", "OTT", "PHI", "PHX", "PIT", "SEA",
    "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WPG", "WSH",
]

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


# ---------------------------------------------------------------- fetching

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                body = res.read().decode("utf-8-sig")
            time.sleep(REQUEST_DELAY_S)
            return body
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt == 3:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
        time.sleep(2 ** (attempt + 1))
    return None


def team_files(season, kind):
    """Team abbreviations with a CSV in this season's directory listing."""
    listing = http_get(f"{BASE_URL}/{season}/regular/{kind}/")
    if listing:
        teams = sorted(set(re.findall(r'href="([A-Z.]{2,4})\.csv"', listing)))
        if teams:
            return teams
    return FALLBACK_TEAMS


def load_rows(season, kind, raw_dir):
    """All CSV rows for one season and kind ('goalies' or 'skaters'), across every team file."""
    rows = []
    if raw_dir:
        files = sorted((Path(raw_dir) / str(season) / kind).glob("*.csv"))
        for f in files:
            rows.extend(csv.DictReader(io.StringIO(f.read_text(encoding="utf-8-sig"))))
        return rows
    for team in team_files(season, kind):
        body = http_get(f"{BASE_URL}/{season}/regular/{kind}/{team}.csv")
        if body:
            rows.extend(csv.DictReader(io.StringIO(body)))
    return rows


# ---------------------------------------------------------------- deriving

def col(row, *names):
    """First of `names` present in the row, as a float. Raises if none exist so a MoneyPuck
    column rename fails the build loudly instead of silently producing zeros."""
    for n in names:
        if n in row and row[n] not in (None, ""):
            return float(row[n])
        if n in row:
            return 0.0
    raise KeyError(f"none of the columns {names} found; available: {sorted(row)[:40]}...")


def num(x):
    """Whole numbers as ints so the JSON stays compact."""
    return int(x) if float(x).is_integer() else round(x, 3)


def fmt_date(d):
    d = str(d)
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 and d.isdigit() else d


def by_situation(rows):
    """{(playerId, gameId): {situation: row}}, deduplicated across team files."""
    out = defaultdict(dict)
    for r in rows:
        out[(r["playerId"], r["gameId"])][r["situation"]] = r
    return out


def build_goalies(rows):
    games = by_situation(rows)
    out = []
    for (_, game_id), sits in games.items():
        r = sits.get("all")
        if r is None:
            continue
        ongoal = col(r, "ongoal")
        ga = col(r, "goals")
        saves = ongoal - ga
        out.append({
            "name": r["name"], "team": r["playerTeam"], "opp": r["opposingTeam"],
            "date": fmt_date(r["gameDate"]), "gameId": str(game_id), "ha": r["home_or_away"],
            "saves": num(saves), "ga": num(ga), "ongoal": num(ongoal),
            "svpct": round(saves / ongoal * 100, 1) if ongoal > 0 else None,
            "shutout": 1 if ga == 0 else 0,
            "win": None,
        })

    # Win/loss isn't in the export. Each team's goals against (summed over its goalies) is the
    # other team's score, so comparing the two totals gives the winner. Equal totals mean the
    # game went to a shootout, which this data can't resolve -> no decision (None).
    ga_by_team = defaultdict(float)
    teams_in_game = defaultdict(set)
    for d in out:
        ga_by_team[(d["gameId"], d["team"])] += d["ga"]
        teams_in_game[d["gameId"]].add(d["team"])
    for d in out:
        teams = teams_in_game[d["gameId"]]
        if len(teams) != 2:
            continue  # only one side's goalies present; can't tell
        opp = next(t for t in teams if t != d["team"])
        mine, theirs = ga_by_team[(d["gameId"], d["team"])], ga_by_team[(d["gameId"], opp)]
        d["win"] = 1 if mine < theirs else 0 if mine > theirs else None

    out.sort(key=lambda d: (d["team"], d["name"], d["date"]))
    return out


def build_skaters(rows):
    games = by_situation(rows)
    out = []
    for (_, game_id), sits in games.items():
        r = sits.get("all")
        if r is None:
            continue
        five = sits.get("5on5")
        pp = sits.get("5on4")
        sh = sits.get("4on5")
        # +/- approximated from 5-on-5 on-ice goals for minus against.
        pm = (col(five, "OnIce_F_goals") - col(five, "OnIce_A_goals")) if five else 0.0
        out.append({
            "n": r["name"], "t": r["playerTeam"], "o": r["opposingTeam"],
            "d": fmt_date(r["gameDate"]), "g": str(game_id), "p": r["position"], "ha": r["home_or_away"],
            "gl": num(col(r, "I_F_goals")),
            "as": num(col(r, "I_F_primaryAssists") + col(r, "I_F_secondaryAssists")),
            "pm": num(pm),
            "pim": num(col(r, "penalityMinutes", "I_F_penalityMinutes", "penaltyMinutes")),
            "ppp": num(col(pp, "I_F_points")) if pp else 0,
            "shp": num(col(sh, "I_F_points")) if sh else 0,
            "sog": num(col(r, "I_F_shotsOnGoal")),
            "ht": num(col(r, "I_F_hits", "hits")),
            "bl": num(col(r, "shotsBlockedByPlayer", "I_F_blockedShots")),
            "fow": num(col(r, "faceoffsWon", "I_F_faceOffsWon", "I_F_faceoffsWon")),
        })
    out.sort(key=lambda d: (d["t"], d["n"], d["d"]))
    return out


# ---------------------------------------------------------------- driver

def current_season(today=None):
    today = today or datetime.date.today()
    return today.year if today.month >= 9 else today.year - 1


def season_label(season):
    return f"{season}-{str(season + 1)[2:]}"


def parse_seasons(arg, out_dir):
    cur = current_season()
    every = list(range(FIRST_SEASON, cur + 1))
    if arg == "all":
        return every
    if arg in (None, "", "auto"):
        missing = [s for s in every if not (out_dir / str(s) / "skaters.json").exists()]
        return sorted(set(missing + [cur]))
    if arg == "current":
        return [cur]
    return sorted(int(s) for s in arg.split(","))


def write_json(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, separators=(",", ":"), ensure_ascii=False))


def write_seasons_index(out_dir):
    seasons = sorted(
        (int(p.name) for p in out_dir.iterdir()
         if p.is_dir() and p.name.isdigit() and (p / "goalies.json").exists() and (p / "skaters.json").exists()),
        reverse=True,
    )
    index = [{"season": s, "label": season_label(s)} for s in seasons]
    (out_dir / "seasons.json").write_text(json.dumps(index, indent=2) + "\n")
    return index


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seasons", default="auto", help="auto (default), current, all, or comma-separated start years")
    ap.add_argument("--out", default=str(DATA_DIR), help="output data directory (default: data/)")
    ap.add_argument("--raw-dir", help="read CSVs from this directory instead of downloading")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    seasons = parse_seasons(args.seasons, out_dir)
    print(f"Building seasons: {', '.join(map(str, seasons))}")

    failures = []
    for season in seasons:
        try:
            goalie_rows = load_rows(season, "goalies", args.raw_dir)
            skater_rows = load_rows(season, "skaters", args.raw_dir)
            if not goalie_rows or not skater_rows:
                print(f"  {season}: no data published yet, skipping")
                continue
            goalies = build_goalies(goalie_rows)
            skaters = build_skaters(skater_rows)
            write_json(out_dir / str(season) / "goalies.json", goalies)
            write_json(out_dir / str(season) / "skaters.json", skaters)
            print(f"  {season}: {len(goalies):,} goalie-games, {len(skaters):,} skater-games")
        except Exception as e:  # keep going so one bad season doesn't block the rest
            print(f"  {season}: FAILED - {e}", file=sys.stderr)
            failures.append(season)

    index = write_seasons_index(out_dir)
    print(f"seasons.json lists {len(index)} season(s)")
    if failures:
        sys.exit(f"Failed seasons: {failures}")


if __name__ == "__main__":
    main()
