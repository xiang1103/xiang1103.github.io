# CLAUDE.md — xiang1103.github.io redesign

Context, constraints, and plan for rebuilding the front end of Xiang Liu's personal site.
Keep this file updated as decisions are made.

---

## 0. Guiding principle — simplicity

**The site must be fast and quiet.** It should load almost instantly and be pleasant to
scroll top to bottom. No fancy animations, no scroll effects, no parallax, no carousels, no
frameworks, no analytics, no JS that isn't earning its place. The *layout and typography*
carry the modernity — not motion or interactivity.

Concretely, the budget:
- **One stylesheet**, one small JS file (the theme toggle). Nothing else.
- **No icon webfonts** (that's ~2 network requests and 100s of KB for six glyphs) — inline SVG.
- **At most 2 font families**, only the weights actually used, `display=swap`.
- **No layout-shifting** on load: images get explicit `width`/`height`, fonts get a real
  fallback stack, theme is resolved before first paint.
- Transitions, if any: color only, ≤150ms. Nothing that moves or resizes.

When in doubt between "clever" and "boring but instant", pick boring.

---

## 1. Goal

Rebuild the **entire front end** (layout, CSS, page structure, visual design) of this site
based on reference images + instructions supplied by the user.

**Hard requirement: content is preserved.** `index.md` and the other content files stay the
source of truth for text. The redesign changes *presentation*, not *prose*. Do not rewrite,
summarize, reorder, or "improve" the user's words unless explicitly asked.

---

## 2. What this site is today

- Static site built with **Jekyll**, deployed by **GitHub Pages** from the `main` branch of
  `git@github.com:xiang1103/xiang1103.github.io.git`.
- User page (`<user>.github.io`), so the site lives at the **domain root** — `baseurl` is
  empty and there is no path prefix.
- Based on the **[minimal-light](https://github.com/yaoyao-liu/minimal-light)** theme
  (`remote_theme: yaoyao-liu/minimal-light` in `_config.yml`), but the important files are
  vendored locally and **local files win over the remote theme**.

### File map

| Path | Role | Redesign status |
|---|---|---|
| `index.md` | **All homepage content** (About Me, News, Miscellaneous, commented-out Advices). Front matter: `layout: homepage`. | **Keep content. Do not edit prose.** |
| `_config.yml` | Site metadata: title, position, affiliation, email, motto, SEO keywords, avatar, favicons, social links (`cv_link`, `github_link`, `linkedin`, `twitter`), `font`, `auto_dark_mode`, `remote_theme`. | Keep keys that still feed the new design; add new ones as needed. |
| `_layouts/homepage.html` | The only layout. Renders `<head>`, sidebar header (avatar, name, position, affiliation, email, motto, social icons), then `{{ content }}`, then footer. | **Rewrite** — this is the main redesign target. |
| `_includes/publications.md` | Publication list markup, loops `site.data.publications.main`. Not currently included by `index.md`. | Rewrite or drop (see open questions). |
| `_includes/services.md` | Reviewer-services block. Not included by `index.md`; content is the theme author's, not Xiang's. | Likely delete. |
| `_data/publications.yml` | **Theme demo data (Yaoyao Liu's papers), not Xiang's.** | Empty or replace; never ship as-is. |
| `_sass/minimal-light.scss` (596 lines) | Theme styles incl. dark mode. | **Replace** with new stylesheet. |
| `_sass/minimal-light-no-dark-mode.scss` | Light-only variant. | Replace or delete with the dark-mode strategy. |
| `assets/css/style.scss` | Front-matter stub that just `@import "minimal-light"` → compiled by Jekyll to `/assets/css/style.css`. | Keep the pattern, change the import. |
| `assets/css/style-no-dark-mode.scss` | Same for the no-dark-mode variant. | Same. |
| `assets/css/publications.css`, `publications-no-dark-mode.css` | Plain CSS for publication rows. | Fold into the new stylesheet. |
| `assets/css/font.css`, `font_sans_serif.css` | Google Fonts import + base `body` font. Serif = Crimson Pro; sans variant exists. | Replace with new type system. |
| `assets/js/scale.fix.js` | Old mobile zoom fix. | Probably unnecessary; verify before deleting. |
| `assets/js/favicon-switcher.js` | Swaps favicon for dark mode in browsers that ignore `media` on `<link rel=icon>`. | Keep. |
| `assets/img/` | `IMG_4275.jpeg` (current avatar), `avatar.png`, `favicon.png`, `favicon-dark.png`, `teaser_example*.png` (theme demo images). | Keep avatar + favicons; delete teaser demos when publications go. |
| `assets/files/` | `Xiang Liu_Resume (4).pdf` (linked as `cv_link`), `curriculum_vitae.pdf` (theme demo), `CSE_487_Report...pdf` (linked from News). | **Keep the two linked PDFs — filenames are live URLs.** |
| `html_source_file/` | Snapshot of the theme's rendered HTML. Excluded from the build in `_config.yml`. | Reference only; safe to ignore or delete. |
| `main/` | Empty directory. | Ignore. |
| `mkdocs.yml` | Leftover from a MkDocs experiment; unused by Jekyll. | Ignore / delete. |
| `CNAME` | **Contains only a newline** — no custom domain. Site serves at `https://xiang1103.github.io/`. | Leave empty unless a domain is being set up. |
| `README.md`, `LICENSE` | Upstream theme's README (CC-BY-SA-4.0-ish, see LICENSE). Excluded from build. | Rewrite README eventually; keep LICENSE attribution. |

---

## 3. GitHub Pages constraints (non-negotiable)

These shape every implementation choice:

1. **No build step of our own.** GitHub Pages runs Jekyll itself on push to `main`. There is
   no `.github/workflows/` here. So: **no npm, no Vite, no Tailwind CLI, no PostCSS, no
   bundler, no React/Next build output.** Everything must be plain HTML/CSS/JS or something
   Jekyll compiles natively (Sass/SCSS).
   - *If* a build tool becomes necessary, it requires adding a GitHub Actions workflow and
     switching the repo's Pages source to "GitHub Actions". Ask before going there.
2. **Jekyll runs in safe mode** with only [whitelisted plugins](https://pages.github.com/versions/).
   `jekyll-remote-theme`, `jekyll-seo-tag`, `jekyll-sitemap`, `jekyll-feed` are allowed.
   Custom `_plugins/*.rb` will be **silently ignored**. Do not write custom plugins.
3. **Sass is compiled by Jekyll**, not by us. A `.scss` file in `assets/css/` needs the empty
   `---\n---` front matter to be processed; partials live in `_sass/` and are `@import`ed.
   Dart-Sass-only syntax (`@use`, `@forward`) is **not** safe — GitHub Pages still uses the
   older Ruby Sass converter. Stick to `@import`, nesting, variables, mixins.
4. **Paths.** User page ⇒ root deploy. The current layout uses `./assets/...` relative paths,
   which happen to work only because every page is at the root. Prefer
   `{{ '/assets/...' | relative_url }}` in the new layout so nested pages don't break.
5. **Case-sensitive filesystem** on the Pages server (macOS is not). Filenames must match
   exactly, including `IMG_4275.jpeg`.
6. **Filenames with spaces/parens** (`Xiang Liu_Resume (4).pdf`) work but must be
   URL-encoded in markdown links (`%20`, `%20(4)`). The existing links already do this —
   don't "clean up" these names without updating every link.
7. **External assets must be CDN-hosted over HTTPS** (currently cdnjs for Font Awesome +
   Academicons, Google Fonts for type). Self-hosting fonts in `assets/` is also fine and
   faster; consider it.
8. **No server-side anything.** No forms that POST, no env vars, no secrets. Any contact form
   would need a third-party endpoint — ask first.
9. **Deploy = `git push origin main`.** Propagation takes ~1 min. Assets are cached
   aggressively; if a CSS change doesn't show, that's the CDN/browser, not the code.
10. **`_site/`, `.jekyll-cache/`, `Gemfile.lock` are gitignored.** Never commit build output.

---

## 4. Local development

macOS system Ruby (2.6) cannot build Jekyll 3.x's native dependencies. A modern Ruby
is installed via Homebrew; it is not on `PATH` by default, so prefix it:

```bash
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"   # or .../Cellar/ruby/<version>/bin
bundle install                                    # installs into ./vendor/bundle
bundle exec jekyll build                          # -> _site/
bundle exec jekyll serve                          # -> http://127.0.0.1:4000
```

Notes:
- Gems install into `vendor/bundle` (`bundle config set --local path vendor/bundle`) so
  nothing needs sudo. `vendor/` and `.bundle/` are gitignored **and** listed in
  `_config.yml`'s `exclude` — a custom `exclude` replaces Jekyll's defaults, so without
  that line Jekyll tries to build the gems' own template files and errors out.
- The `Gemfile` declares `csv`, `base64`, `logger`, `bigdecimal`, and `rexml`. These left
  the Ruby standard library in 3.4; Jekyll 3.x won't boot on a modern Ruby without them.
- `--livereload` needs `eventmachine`, which fails to compile here. Plain `serve` is fine.
- **None of this affects the deployed site.** GitHub Pages builds with its own pinned
  toolchain and ignores the Gemfile.

### Checking the rendering without a browser

Headless Chrome enforces a minimum window width, so `--window-size=390,…` does **not**
give a 390px viewport. To test small screens, load the page in a sized `<iframe>` from a
scratch HTML file and screenshot that — the iframe's width is a real viewport for media
queries. To check dark mode, copy `_site/index.html` with `data-theme="dark"` on `<html>`
and screenshot the copy.

---

## 5. Design direction

**Reference:** [tania.dev](https://tania.dev) homepage screenshot supplied 2026-09-06.
Reproduce the **layout and structure** closely; **color palette, typography, and graphics
are ours to choose**. Ships as a **single long page** (nav links are on-page anchors).

### 5.1 Structure — two columns

```
┌───────────────────┬────────────────────────────────────────┐
│  SIDEBAR (fixed)  │  MAIN (scrolls)                        │
│                   │                                        │
│  [icon] wordmark  │   Hey, I'm Xiang!            ← h1 XL   │
│           ● ☀     │   one-line tagline           ← lead    │
│  ───────────────  │                                        │
│  short bio, with  │   About me                   ← h2      │
│  one accent link  │   prose…                               │
│  ───────────────  │                                        │
│  📝 About         │   News                       ← h2      │
│  📰 News          │   Oct 2025   text text…      ← 2-col   │
│  🔬 Research      │   May 2025   text text…        rows    │
│  🏫 Campus life   │                                        │
│  📄 Resume ↗      │   Research                   ← h2      │
│                   │   …                                    │
│  (flex spacer)    │                                        │
│                   │   Campus life                ← h2      │
│  ✉ ⌨ in 𝕏         │   …                                    │
│  ───────────────  │                          [decorative]  │
│  Resume | Source  │                                        │
└───────────────────┴────────────────────────────────────────┘
```

- **Sidebar**: fixed/sticky, full viewport height, does **not** scroll with the page.
  Width `clamp(240px, 24vw, 300px)`. Separated from main by a **1px hairline border-right**
  in a muted border color (not a heavy rule). Internal padding ~`1.75rem`, contents laid out
  with `display:flex; flex-direction:column` and a `flex:1` spacer above the social row so
  the socials + footer links pin to the bottom.
- **Main**: `max-width: 46rem` of text measure, left padding ~`4rem` (desktop), generous top
  padding (~`4rem`) so the h1 starts well below the viewport top. Page background is one
  continuous color across both columns — no card, no shadow, no container borders.
- The whole design is **flat**: no boxes, no rounded cards, no drop shadows. Hierarchy comes
  from type weight/size, color, and whitespace only.

### 5.2 Sidebar contents (top → bottom)

1. **Brand row** — small square icon (favicon, or an emoji) + wordmark in **monospace**,
   ~`1rem`, bold, letterspaced slightly tight. Right side of the row: a **theme toggle**
   button (sun/moon icon). The reference also shows a small accent dot; ours can drop it or
   use it as an "available for X" status dot — decide at build time, it's decorative.
2. Hairline divider (`border-top`, muted).
3. **Bio blurb** — 2–3 lines, ~`0.95rem`, slightly muted text, with the name (or one key
   phrase) as an accent-colored link. Sourced from a new `_config.yml` key (`blurb`), not
   hardcoded in the layout.
4. Hairline divider.
5. **Nav list** — vertical, one item per row, `icon + label`, ~`1.05rem`, comfortable
   `0.55rem` row gap. Icons are emoji in the reference; we can use emoji or small inline
   SVGs (see §5.5). Items are **on-page anchors** (`#about`, `#news`, …) plus one external
   item (Resume PDF) marked with a small ↗. Hover: label shifts to accent color. The section
   currently in view gets an "active" style (see §6.6).
   Nav is data-driven from `_data/nav.yml` so items can be added without touching the layout.
6. `flex: 1` spacer.
7. **Social icon row** — 4–5 monochrome inline SVG icons (email, GitHub, LinkedIn, X, RSS?),
   ~20px, muted; hover → accent. Driven by the existing `_config.yml` link keys.
8. **Footer link row** — small text links separated by `|` (e.g. `Resume | Source`),
   ~`0.85rem`, muted.

### 5.3 Main content — components

- **h1** — very large and heavy: `clamp(2.75rem, 6vw, 4rem)`, weight 800, `letter-spacing:
  -0.03em`, tight `line-height: 1.05`. This is the single most distinctive element of the
  reference; do not shrink it.
- **Lead / tagline** — directly under h1, `1.25rem`, regular weight, normal text color,
  ~`0.5rem` gap. Comes from `_config.yml` (`position` + `affiliation`, or a new `tagline`).
- **h2 section headings** — `1.3rem`, weight 700, `margin-top: 3rem`, sits noticeably closer
  to its own content than to the section above.
- **Body** — `1.0625rem`/`1.7`. Comfortable, not cramped.
- **Timeline rows** — the signature component, a 2-column grid per entry:
  - left: date/label in **monospace**, `0.875rem`, muted, top-aligned, fixed `7.5rem` column;
  - right: the text, which may start with an accent **bold link** ("Professional chef:")
    followed by prose;
  - `row-gap: 1.5rem` between entries.
  This maps directly onto the existing `## News` list in `index.md` — see §6.4 for how to get
  the grid out of plain markdown without editing the prose.
- **Links** — accent color, `text-decoration: underline` with `text-underline-offset: 2px`
  and a thin `text-decoration-thickness`. Bold when the link is a "title" inside a timeline
  row (that's just how the markdown is authored). Hover: darker accent + thicker underline.
  External links get `target="_blank" rel="noopener"` via a tiny JS pass, not by hand.
- **Decorative graphic** — the reference has a mascot illustration bottom-right of the main
  column. Ours is an **optional slot** at the end of `<main>`: could be the avatar photo, a
  simple SVG, or nothing. Must be `aria-hidden` and must not affect layout on mobile.
  Default: omit until we have art we actually like.

### 5.4 Color

Implemented as **CSS custom properties on `:root`**, with a dark-mode block that only
re-declares the token values. Never hardcode a hex outside the token block.

```
--bg            page background (warm off-white / paper)
--bg-subtle     sidebar tint, if any (reference uses a barely-different tint)
--text          body text (near-black, not #000)
--text-muted    dates, blurb, footer links
--accent        links, hover, active nav
--accent-hover  darker accent for :hover
--border        hairlines (sidebar rule, dividers)
--focus         focus ring (can equal accent)
```

**DECIDED (2026-09-06): warm paper + deep teal.** Default until the user says otherwise;
swapping the palette means editing only the two token blocks below.

```scss
:root {
  --bg: #FBF7F0;          // warm paper
  --bg-subtle: #F6F1E7;   // sidebar tint (barely different)
  --text: #1C1A17;        // near-black, warm
  --text-muted: #6B655C;
  --accent: #0F6E63;      // deep teal
  --accent-hover: #0A544B;
  --border: #E4DDD1;
  --focus: #0F6E63;
}
// dark: --bg #16150F, --bg-subtle #1B1A13, --text #EDE8DE, --text-muted #9A938A,
//       --accent #4FC7B4, --accent-hover #6FDCC9, --border #2E2B24
```

Requirements the palette must keep meeting: warm/low-glare background rather than pure white;
near-black rather than pure black text; one saturated accent used sparingly; ≥4.5:1 contrast
for body text and ≥3:1 for the accent on background — **verify with a contrast checker in
both themes**, don't assume.

### 5.5 Typography & icons

**DECIDED (2026-09-06): Space Grotesk + JetBrains Mono.**

```
h1 / h2 / nav / body   Space Grotesk   (700/800 for display, 400 body)
wordmark / dates       JetBrains Mono  (400/500)
fallbacks              system-ui, -apple-system, "Segoe UI", sans-serif
                       ui-monospace, SFMono-Regular, Menlo, monospace
```

Load only the weights actually used (Space Grotesk 400/500/700, JetBrains Mono 400) and use
`display=swap`. Two roles: **display/UI sans** (h1, h2, nav, body) and **monospace**
(wordmark, dates, small labels). No third family. The reference's personality comes from a heavy geometric sans
for the h1 against a plain mono for the timeline labels — keep that contrast.

- Load fonts from Google Fonts (as today) or self-host in `assets/fonts/`. Self-hosting is
  faster and avoids a third-party request; do it if we settle on ≤2 families.
- Always ship a real fallback stack (`system-ui, -apple-system, Segoe UI, sans-serif`).
- **Icons — DECIDED (2026-09-06): inline SVG**, one file per icon in `_includes/icons/`,
  `fill="currentColor"` so they inherit text color and adapt to dark mode automatically.
  This **removes the Font Awesome + Academicons CDN loads** — two icon webfonts for ~6 glyphs
  is the single biggest performance waste in the current site. No emoji in the nav.

### 5.6 Responsive

- **> 900px**: two columns as drawn.
- **≤ 900px**: sidebar becomes a normal block at the top of the document (`position: static`,
  full width, `border-right` → `border-bottom`). Nav goes horizontal and wraps; social row
  and footer links sit inline under it. Main column loses its large left padding.
- **≤ 480px**: timeline rows collapse to a single column — the date label becomes its own
  line above the text. h1 scales down via its `clamp()`.
- No horizontal scroll at 375px. Any wide element gets its own `overflow-x:auto`.

### 5.7 Constraints that hold regardless of visual direction

- **Content parity.** Everything currently rendered from `index.md` must still render:
  About Me, News (with links), Miscellaneous, "Last Updated" line. The commented-out
  **Advices** block stays commented unless the user says otherwise.
- **Markdown-driven.** Design must style plain markdown output (`h2/ul/li/a/strong/p`).
  Never require hand-written HTML per news entry. If richer structure is genuinely needed,
  move that section to `_data/*.yml` + an include and document how to edit it.
- **Dark mode** stays automatic (`prefers-color-scheme`), and now *also* gets the manual
  toggle the reference shows (see §6.5).
- **Accessibility**: semantic `header`/`nav`/`main`/`footer`, one `h1`, visible focus rings,
  `alt` on images, toggle button is a real `<button>` with `aria-label`, nav is a `<nav>`
  with a list.
- **SEO**: preserve `<title>`, description, keywords, canonical from `_config.yml`; add Open
  Graph + Twitter card tags while we're rewriting `<head>`.
- **Favicon**: keep the light/dark pair and `favicon-switcher.js`.

---

## 6. Implementation details

### 6.1 Files to create / change

| File | Action |
|---|---|
| `_layouts/homepage.html` | **Rewrite.** New `<head>`, sidebar `<aside>`, `<main>{{ content }}</main>`. |
| `_sass/tokens.scss` | **New.** CSS custom properties: color tokens (light + dark), type scale, spacing scale, layout widths. |
| `_sass/base.scss` | **New.** Reset, `html/body`, typography defaults, link/heading/list styles, focus rings. |
| `_sass/layout.scss` | **New.** Two-column shell, sidebar, main column, responsive breakpoints. |
| `_sass/components.scss` | **New.** Nav list, social row, timeline rows, dividers, theme toggle, decorative slot. |
| `assets/css/style.scss` | Keep the `---\n---` front matter; change body to import the four partials above instead of `minimal-light`. |
| `_data/nav.yml` | **New.** Sidebar nav items: `label`, `href`, `icon`, optional `external: true`. |
| `_includes/icons/*.svg` | **New (optional).** One file per inline SVG icon; included with `{% include icons/github.svg %}`. |
| `assets/js/theme-toggle.js` | **New.** Manual light/dark toggle + `localStorage`. |
| ~~`assets/js/nav-active.js`~~ | **Dropped** — active-section highlighting is JS that does not earn its place under §0. |
| `_config.yml` | Add `blurb`, `tagline`, `wordmark`; keep existing metadata + social keys. |
| `index.md` | **Content untouched.** Only permitted change: adding `{: #id }` anchors to headings if Kramdown's auto-ids aren't sufficient (they are — see §6.3). |
| `_sass/minimal-light*.scss`, `assets/css/publications*.css`, `font*.css`, `scale.fix.js` | Delete **after** the new styles are in and nothing references them. |
| `remote_theme:` in `_config.yml` | **Remove.** Once every layout/include/style is local, the remote theme is dead weight and a surprise-upgrade risk. |

### 6.2 Sass entry point

`assets/css/style.scss` must keep the empty front matter or Jekyll won't compile it:

```scss
---
---
@import "tokens";
@import "base";
@import "layout";
@import "components";
```

Ruby-Sass-compatible syntax only: `@import`, nesting, `$variables`, `@mixin`/`@include`.
**No `@use`, no `@forward`, no `math.div`.** Color tokens live in `:root` as CSS custom
properties (runtime, not Sass variables) so the dark-mode swap is a single block.

### 6.3 Section anchors from markdown

Kramdown (GitHub Pages' markdown engine) auto-generates heading ids: `## About Me` →
`id="about-me"`, `## News` → `id="news"`, `## Miscellaneous` → `id="miscellaneous"`.
So `_data/nav.yml` can point at `#about-me` etc. with **zero changes to `index.md`**.
Verify the generated ids in the built HTML before wiring nav hrefs; if a heading is renamed
later, the nav yml must be updated to match.

Add `scroll-behavior: smooth` on `html` (inside a `prefers-reduced-motion: no-preference`
guard) and `scroll-margin-top` on `h2` so anchored sections don't land flush against the
viewport edge.

### 6.4 Timeline rows from plain markdown  ← the one tricky bit  **[BUILT]**

`index.md` authors News as:

```markdown
- **[Oct. 2025]** Accepted an offer from Capital One's ...
```

which renders as `<li><strong>[Oct. 2025]</strong> Accepted an offer …</li>`. The date has
to sit in a left gutter without editing the prose.

**The grid approach was tried and does not work — do not reintroduce it.** Making the `<li>`
a grid container promotes *every inline child* to its own grid item, not just the
`<strong>`: only bare text runs get wrapped into anonymous items. So any entry containing a
link had its `<a>` elements scattered into the date column. Three of five News entries broke.

**What ships instead:** the label is lifted out of the flow and parked in the gutter, which
is indifferent to whatever the entry contains.

```scss
h2#news + ul {
  list-style: none;
  padding-left: 0;

  li { position: relative; padding-left: 9rem; }
  li > strong:first-child { position: absolute; top: 0; left: 0; width: 7.5rem; }
}
```

Caveats:
- Assumes `<strong>` is the **first child** of the `<li>`. An entry starting with plain text
  renders with an empty gutter. Keep authoring entries as `- **[Mon. Year]** text`.
- Scoped off the Kramdown heading id (`h2#news + ul`), so `index.md` needs no class. If the
  `## News` heading is renamed, update this selector **and** `_data/nav.yml` together.
- Below 480px the label reverts to `position: static; display: block` so the text gets the
  full width. That override lives in `components.scss` — see §6.4.1.
- **Escape hatch:** if this ever proves fragile, move News into `_data/news.yml` +
  `_includes/news.html` and have `index.md` call `{% include news.html %}`.

### 6.4.1 Sass import order  ← bit me once

`style.scss` imports `tokens → base → layout → components`. A responsive override in
`layout.scss` **loses** to a component's default in `components.scss` at equal specificity,
because components is imported later. The mobile nav and mobile timeline rules were
originally written in `layout.scss` and silently did nothing.

**Rule: a component's breakpoint rules live in `components.scss`, after its defaults.**
`layout.scss` carries only the page shell (`.page`, `.sidebar`, `.main`).

### 6.5 Theme toggle (no flash)

- `<html>` carries `data-theme="light" | "dark"`; absence = follow the system.
- Tokens are declared three times: `:root` (light), `@media (prefers-color-scheme: dark)
  { :root:not([data-theme="light"]) { … } }`, and `:root[data-theme="dark"] { … }` — so an
  explicit choice wins in both directions.
- A **tiny inline script in `<head>`** (before any paint) reads `localStorage.theme` and sets
  the attribute, preventing a light-mode flash on a dark-preferring device. It must be inline
  — an external file loads too late.
- `assets/js/theme-toggle.js` (deferred) wires the button: cycles the value, writes
  `localStorage`, updates `aria-label`/icon.
- Wrap every `localStorage` access in `try/catch` (private mode / blocked storage throws).

### 6.6 Active nav highlight (progressive enhancement)

`assets/js/nav-active.js`: IntersectionObserver over the `h2` section headings; when one
enters the top band of the viewport, add `.is-active` to the matching nav link. Must degrade
to "nothing happens" with JS off. Skip entirely if it fights the sticky sidebar.

### 6.7 Verification checklist (before every push)

- [ ] `bundle exec jekyll serve` builds with no warnings
- [ ] Desktop ≥1280px, tablet ~900px, phone 375px — no horizontal scroll
- [ ] Light + dark, both automatic and via the toggle; no flash on load
- [ ] Sidebar stays put while main scrolls; nav anchors land correctly
- [ ] Every link in `index.md` resolves, including both PDFs (spaces/parens URL-encoded)
- [ ] Avatar + favicons load (case-sensitive filenames!)
- [ ] Keyboard-only pass: visible focus on every link, nav, and the toggle
- [ ] View source: `<title>`, description, canonical, OG tags present

---

## 7. Plan

1. ~~Capture the brief~~ — done, §5.
2. Confirm palette + type direction with the user (§8 records the decision).
3. Build the **style foundation**: `_sass/tokens|base|layout|components.scss`, rewire
   `assets/css/style.scss`.
4. **Rewrite `_layouts/homepage.html`** — head, sidebar shell, main region, footer.
5. Add `_data/nav.yml`, inline SVG icons, new `_config.yml` keys (`blurb`, `tagline`).
6. **Timeline styling** for News (§6.4) — verify the grid trick in a real browser.
7. **Theme toggle** + no-flash inline script.
8. **Responsive + a11y pass** (§5.6, §6.7).
9. **Prune** dead theme files; remove `remote_theme`. Grep before each delete.
10. Verify locally against §6.7, then commit in small steps. **Push only when asked.**

## 8. Open questions

- [x] ~~Font direction~~ → Space Grotesk + JetBrains Mono (§5.5).
- [x] ~~Nav icons~~ → inline SVG (§5.5).
- [ ] Palette — **defaulted** to warm paper + deep teal (§5.4); confirm or pick another.
- [ ] Decorative graphic bottom-right of main — include one, and if so what?
- [ ] Sidebar nav sections: About / News / Research / Campus life — is "Research" a new
      section, or does the current content stay as-is (About / News / Miscellaneous)?
- [ ] Keep the Grateful Dead motto and the obfuscated email in the sidebar?
- [ ] Keep the current avatar photo (`IMG_4275.jpeg`)?
- [ ] Custom domain planned (needs `CNAME` + DNS), or stay on `xiang1103.github.io`?

## 9. Decisions log

- **2026-09-06** — Repo surveyed; this file created.
- **2026-09-06** — Design reference received: tania.dev homepage. Layout to be reproduced
  closely (fixed left sidebar + long scrolling main column); color, type, and graphics are
  ours. **Single long page**, sidebar nav = on-page anchors. Publications section: not
  planned; theme demo data to be removed.
- **2026-09-06** — Type: Space Grotesk (display/body) + JetBrains Mono (dates/wordmark).
  Icons: inline SVG, dropping the Font Awesome + Academicons CDN loads.
  Palette: warm paper + deep teal, chosen as a default (user did not pick); trivially
  swappable via the token blocks in §5.4.
- **2026-09-06** — User: site must be simplistic and fast; layout and fonts modern, but no
  advanced features or animations. Added §0. Consequence: dropped the planned
  `nav-active.js` IntersectionObserver highlight — nice-to-have JS that doesn't earn its
  place on a page this short.
- **2026-09-06** — **Front end built and verified locally.** New `_sass/{tokens,base,layout,
  components}.scss`, rewritten `_layouts/homepage.html`, `_data/nav.yml`, ten inline SVG
  icons in `_includes/icons/`, `assets/js/theme-toggle.js`, rewritten `_config.yml`
  (added `greeting`, `tagline`, `wordmark`, `blurb`, `avatar_small`, `email_link`;
  removed `remote_theme`, `font`, `auto_dark_mode`).
  Deleted the minimal-light leftovers: both `minimal-light*.scss`, `publications*.css`,
  `font*.css`, `style-no-dark-mode.scss`, `scale.fix.js`, `favicon-switcher.js`,
  `_includes/publications.md`, `_includes/services.md`, `_data/publications.yml`,
  `teaser_example*.png`, `avatar.png`, `curriculum_vitae.pdf`.
  Kept (unreferenced but harmless): `html_source_file/`, `mkdocs.yml`, the full-size
  `IMG_4275.jpeg`.
  Avatar: the 1.2 MB `IMG_4275.jpeg` was resized to `assets/img/avatar-xiang.jpg` (320px,
  30 KB) for the 34px sidebar image — the original is untouched.
  `favicon-switcher.js` was dropped: `<link rel="icon" media="...">` handles the light/dark
  pair on its own in current browsers, and §0 allows only one JS file.
  Page weight: one 8 KB stylesheet, one ~1 KB script, two webfont families, one 30 KB image.
  **Not committed** — working tree only, awaiting review.
