# NHL Fantasy Scoring Lab

Interactive comparison of fantasy hockey scoring systems for goalies and skaters, built on
game-by-game data from [MoneyPuck.com](https://moneypuck.com). Each scoring weight is editable
and every chart recalculates live in the browser.

It's a plain static site (HTML + JavaScript + JSON) with no build step, hosted on GitHub Pages.

## Layout

```
index.html            page markup and styles
js/site.js            season selector, data loading, Goalies/Skaters tab routing
js/goalies.js         goalie scoring, charts and tables
js/skaters.js         skater scoring, charts and tables
data/seasons.json     seasons shown in the selector, e.g. [{"season": 2025, "label": "2025-26"}]
data/<season>/goalies.json
data/<season>/skaters.json
pipeline/build_data.py   downloads MoneyPuck data and writes data/<season>/*.json
pipeline/compare.py      compares a fresh build against committed data
.github/workflows/       monthly data refresh + a pipeline check on pull requests
```

`<season>` is the year the season starts (MoneyPuck's convention), so `2025` is 2025-26.
Data for a season is fetched only when that season and tab are viewed.

## Data updates

The **Refresh MoneyPuck data** workflow runs on the 2nd of every month. It downloads MoneyPuck's
per-team game-by-game files
(`https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/<season>/regular/{goalies,skaters}/<TEAM>.csv`),
rebuilds the current season plus any season not yet in `data/` (back to 2008-09), regenerates
`data/seasons.json`, and commits the result. GitHub Pages republishes on that commit.

To run it by hand: **Actions → Refresh MoneyPuck data → Run workflow**, with `seasons` set to
`auto`, `current`, `all`, or specific start years such as `2023,2024`.

Locally (Python 3, no dependencies):

```
python3 pipeline/build_data.py --seasons 2025
```

Fields the export doesn't contain directly are derived:

- **Goalie wins:** a team's goals against (summed over its goalies) is the opponent's score, so
  comparing the two totals gives the winner. Equal totals mean a shootout, which this data can't
  resolve, so those games are "no decision".
- **Skater +/−:** 5-on-5 on-ice goals for minus against.
- **PPP / SHP:** points in the 5-on-4 / 4-on-5 situations.

## Running locally

The page loads its data with `fetch`, so open it through a local web server rather than as a file:

```
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## Publishing on GitHub Pages

Repository **Settings → Pages → Build and deployment**: source **Deploy from a branch**, branch
`main`, folder `/ (root)`. The site is then served at
`https://<user>.github.io/fantasy-scoring-system-analysis/`.

## Data credit

Data courtesy of [MoneyPuck.com](https://moneypuck.com), used under its terms for non-commercial
use with credit.
