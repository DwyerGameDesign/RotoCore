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

## Live leaderboard

The **Live scores** section reads the same Supabase table the game writes to:

```
GET /rest/v1/scores?select=player_name,score&mode=eq.standard&order=score.desc&limit=10
```

Standard and Gradual are tabs; each is fetched once and cached, and nothing is
requested until you scroll the section into view. Names are rendered with
`textContent`, never `innerHTML`, because they're arbitrary player-supplied strings.

## Prototype pacing (retuned)

The prototype felt slow next to the device build for a structural reason: the real
game is played with a crank, and a keyboard can't match that. So rotation is faster
than the shipping numbers rather than equal to them. All changes are commented in
place with their old values.

**`play/game.js`**

| Constant | Was | Now | Why |
|---|---|---|---|
| `ROTATION_SPEED` | `0.06` | `0.105` | full sweep in ~2s instead of ~3.5s |
| `ROTATION_RAMP_FRAMES` | — | `12` | 0.4s of holding to reach top speed |
| `ROTATION_RAMP_MAX` | — | `1.6` | held sweep reaches ~1.25s per rotation |

Tapping still nudges precisely; only holding accelerates. The device build's own
d-pad fallback is `0.06` (`playerConfig.lua`) — matching it exactly is what made this
feel sluggish, since on hardware the d-pad is the backup and the crank is the game.

**`play/configs/enemies.js`**

| Setting | Was | Now |
|---|---|---|
| Spawn interval, phase 1 | 1000ms | **500ms** (the shipping value) |
| Spawn interval, phases 2-5 | 800/750/700/650 | 750/750/700/650 (shipping curve) |
| Burst interval, all phases | flat 15-25s | 10-14s / 8-12s / 8-12s / 10-14s / 10-15s |
| First wave of a run | 15-25s | **6-8s** |

The old phase-1 spawn rate was exactly half the shipping game's — that alone made the
opening thirty seconds feel empty. The flat burst timing was the other problem: with a
first wave 15-25 seconds out, most people quit before seeing a single one.

**Six waves ported from `enemyTypes.lua`,** unchanged apart from dropping the phase 6
weights: Raindown, Side Swipers, The Sprinkler, Wide Net, Circle Carousel, Zigzag
Assault. That's 37 waves total, 7 of them reachable in phase 1.

To revert any of this, the old values are in the comments.

### Read this before you publish

The site uses the same **anon key that's already inside your .pdx** — so it isn't a
new secret, but a website makes it far easier to find. Anyone who opens devtools can
copy it and call your API directly. Check your policies in the Supabase dashboard:

- [ ] **RLS is enabled** on `scores`. If it's off, the anon key is full read/write.
- [ ] `anon` has **SELECT**.
- [ ] `anon` has **INSERT / UPDATE** — the game needs these to submit scores, which
      also means a determined person can post a fake score. That's already true today.
- [ ] `anon` has **no DELETE**. This is the one that matters most: it's the difference
      between someone adding a junk score and someone wiping the whole board.
- [ ] Consider a `CHECK (score >= 0 AND score < 10000000)` constraint so a garbage
      score can't sit permanently at the top.

If you'd rather not expose the key at all, the zero-trust version is a Supabase Edge
Function with JWT verification off that returns the top 10 — then the site calls a
plain public URL with no key. Worth doing if the board ever gets griefed; overkill
until then.

I couldn't test this against your live table from here, so open the browser console
once after deploying. Any failure logs as `[RotoCore] leaderboard fetch failed`, and
visitors see a graceful "can't reach the leaderboard" message rather than a broken
section.

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
