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
```

`<season>` is the year the season starts (MoneyPuck's convention), so `2025` is 2025-26.
Data for a season is fetched only when that season and tab are viewed.

## Adding a season

1. Add `data/<season>/goalies.json` and `data/<season>/skaters.json` in the same row format as
   the existing 2025 files.
2. Add an entry for it to `data/seasons.json`. The newest season is selected by default.

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
