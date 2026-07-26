# RotoCore — website

Single-page site for RotoCore. No build step, no dependencies. Just static files.

## Publish it

1. Make a new **public** repo named `rotocore` under the `dwyergamedesign` account.
2. Drop `index.html`, `assets/`, and this README into it and push.
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder: `/ (root)` → Save.
4. Two minutes later it's live at **https://dwyergamedesign.github.io/rotocore/**

To preview locally before pushing:

```
cd rotocore
python3 -m http.server 8000
# open http://localhost:8000
```

## Six things to edit

Open `index.html` and search for each of these:

| Search for | Replace with |
|---|---|
| `REPLACE_CATALOG` | your Playdate Catalog URL (5 places) |
| `REPLACE_ITCH` | your itch.io URL (4 places) |
| `REPLACE_EMAIL` | your press contact email (5 places) |
| `data-edit="price"` | the price, e.g. `$5` (2 places) |
| `data-edit="date"` | the release date (2 places) |
| `REPLACE_SITE_URL` | `https://dwyergamedesign.github.io/rotocore` — for link previews |

Not on Catalog yet? Point both buttons at itch for now and swap one later.

## Screenshots

Drop `01.png` through `04.png` into `assets/screens/`. Native 400×240 grabs are ideal —
they're displayed pixelated so they stay crisp. Missing files show a dashed placeholder
tile instead of a broken image, so you can publish before you have all four.

## Trailer

Search `index.html` for `TRAILER SLOT` and follow the comment — paste your YouTube ID
into the iframe and delete the placeholder div.

## The playable prototype

Your browser prototype is the hero of the page — a click-to-load embed in the top
right, so none of the ~200 KB of game code downloads until someone presses play.
It also lives on its own at `play/` for direct linking.

Three additions to `play/index.html`. **No changes to `game.js`, `styles.css` or
`configs/`.**

1. **A start hint.** The menu screen says "Ⓐ PLAY", but a browser player has no
   way to know Ⓐ means the `X` key — so it looks like the game is frozen on the
   title. A caption now reads *Press X to play*, and disappears once you do.
2. **The drawn console works.** Clicking the A and B buttons and the left/right
   d-pad fires the keys `game.js` already listens for (`x`, `z`, arrows). The
   A and B labels show their key. This also makes it playable on a phone.
3. **It blends in when embedded** — the grey backdrop goes transparent inside the
   iframe, and a "← Back to RotoCore" link appears only on the standalone page.

- Direct link: `https://dwyergamedesign.github.io/rotocore/play/`
- Controls: `X` start / Ⓐ, `Z` Ⓑ, ← → rotate, `,` `.` crank sim, `P` pause
- The prototype saves high scores and upgrades to browser localStorage under
  `rotocore*` keys — per-browser, harmless, but progress does persist between visits.

If you'd rather not feature an older build, delete `play/` and remove the
`hero__demo` block in `index.html` plus the footer link to it.

## Assets already included

| File | What it is |
|---|---|
| `assets/wordmark.png` | full lockup, logo + tagline, transparent |
| `assets/logo.png` | logo only, cropped from the above, used in the header |
| `assets/banner.png` | your itch banner, also used as the social preview image |
| `assets/play-on-playdate.png` | the badge, cropped out of the banner |
| `assets/robodwyer.png` | your dev logo, recoloured white for the dark footer |
| `assets/icon.png` | the game icon, used as the favicon |

## Later, if you want a domain

Buy one, add it under Settings → Pages → Custom domain, and GitHub redirects the
`github.io` URL automatically. Nothing in these files needs to change except
`REPLACE_SITE_URL`.
