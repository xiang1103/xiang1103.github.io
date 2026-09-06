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

**Hard requirement: content is preserved.** The redesign changes *presentation*, not *prose*.
Do not rewrite, summarize, reorder, or "improve" the user's words unless explicitly asked.

**Hard requirement: the page must not be limited to what markdown can express.** The
homepage is expected to grow graphics, diagrams, richer components, and possibly light
animation. The original `index.md` prose was the *initial* content, not the ceiling. Anything
that can only be done by hand-writing HTML into a prose file is a design failure — see §6.3
for the section architecture that replaced it.

---

## 2. What this repo is

- Static site built with **Jekyll**, deployed by **GitHub Pages** from `main` of
  `github.com/xiang1103/xiang1103.github.io`.
- User page, so it serves from the **domain root**: `baseurl` is empty, no path prefix,
  no custom domain (`cname: null`).
- **Nothing of the original [minimal-light](https://github.com/yaoyao-liu/minimal-light)
  theme remains.** Layout, stylesheet, page architecture, icons, and favicons were all
  rewritten; `remote_theme` is gone. The theme is CC0, credited in the README.

### File map

| Path | Role |
|---|---|
| `index.html` | Root entry point. **Front matter only, no content.** Jekyll requires a page at the root, so this file must exist; its body is an optional free-form slot rendered between the hero and the first section. (Was `index.md` until the content moved into `_sections/`.) |
| `_config.yml` | Site metadata and all hero/sidebar copy: `greeting`, `tagline`, `wordmark`, `blurb`, `motto`, `last_updated`, social links, image paths, the `sections` collection, and `exclude`. |
| `_sections/*.md` | **One file per page section.** Ordered by `order`. Front matter decides how it renders — see §6.3. |
| `_data/news.yml` | Timeline entries: date, body, optional tag/image/links. |
| `_data/nav.yml` | Nav items that are *not* sections (external links, downloads). Section links generate themselves. |
| `_layouts/homepage.html` | The only layout: head, sidebar, hero, sections loop, closing lines. |
| `_includes/section.html` | Renders one section from its front matter; dispatches on `variant`. |
| `_includes/sections/timeline.html`, `cards.html` | Variant renderers. |
| `_includes/figure.html` | Figure with optional caption and float side. |
| `_includes/icons/*.svg` | Ten inline SVG icons, `currentColor`. |
| `_sass/tokens.scss` | Every color, type, spacing, and layout token. Nothing else declares a hex. |
| `_sass/base.scss` | Reset and element defaults; styles markdown output. |
| `_sass/layout.scss` | Page shell only: `.page`, `.sidebar`, `.main`. |
| `_sass/components.scss` | Every component **and its own breakpoints** (§6.4.1). |
| `assets/css/style.scss` | Front-matter stub importing the four partials in order. |
| `assets/js/theme-toggle.js` | The only JavaScript on the site. |
| `assets/img/xiang-hero.jpg` | 480x640, the full uncropped photo shown beside the h1. |
| `assets/img/avatar-xiang.jpg` | 96px square crop, the 34px sidebar mark. |
| `assets/img/IMG_4275.jpeg` | 1.2 MB original. Kept as the source for re-cropping, **excluded from the build** so it is never published. |
| `assets/img/favicon.png`, `favicon-dark.png` | Teal "x" mark, light and dark. |
| `assets/files/*.pdf` | Resume and the CSE 487 report. **Filenames with spaces/parens are live URLs** — see §3.6. |
| `Gemfile` | Local preview only; GitHub Pages ignores it (§4). |
| `README.md` | Short orientation for a human: where to edit what. |
| `LICENSE` | CC0, inherited from minimal-light. Harmless to keep; nothing obliges it. |

### Removed from the original design

`html_source_file/` (the theme's rendered demo), `mkdocs.yml` (a dead MkDocs experiment),
`CNAME` (empty, and Pages reports `cname: null`, so it configured nothing), the theme's
`m`-logo favicons, `_sass/minimal-light*.scss`, `publications*.css`, `font*.css`,
`style-no-dark-mode.scss`, `scale.fix.js`, `favicon-switcher.js`,
`_includes/publications.md`, `_includes/services.md`, `_data/publications.yml`,
`teaser_example*.png`, `avatar.png`, `curriculum_vitae.pdf`, and the empty `main/`.

**Before deleting anything else**: grep for it, and check whether it is a live URL
(`assets/files/`) or a Jekyll requirement (a root page file).

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

## 4.5 Deployment — how this site actually ships

`git push origin main` is the whole deploy. GitHub Pages does the rest, but the feedback is
easy to misread, so:

### What happens on push

1. GitHub queues a **`pages build and deployment`** workflow run (`build_type: legacy` — the
   classic "deploy from a branch" builder; there is no workflow file in this repo, GitHub
   supplies it).
2. It builds with its own pinned Jekyll and ignores the `Gemfile` entirely.
3. It publishes and creates a `github-pages` deployment.

Typical time: the build itself takes **~35-40 seconds**, but it can sit **queued for many
minutes** before starting. A push is not "done" the moment it lands.

### The check mark

The ✓ next to a commit comes from that workflow's **check runs** (`build`, `deploy`,
`report-build-status`). They do not exist until the run starts, so a freshly pushed commit
legitimately shows **no mark at all** for a while. No mark ≠ failure.

Note it is check *runs*, not commit *statuses*: `/commits/<sha>/status` returns
`{state: pending, statuses: 0}` even for a fully successful build. Use `/check-runs`.

### Checking it from here

```bash
# Did the push actually land?
gh api repos/xiang1103/xiang1103.github.io/commits/main --jq '.sha[0:7] + "  " + .commit.message'

# Build state for the newest commit
gh api repos/xiang1103/xiang1103.github.io/pages/builds/latest \
  --jq '{status, commit: .commit[0:7], error: .error.message}'

# Recent build history
gh api "repos/xiang1103/xiang1103.github.io/pages/builds?per_page=5" \
  --jq '.[] | .created_at + "  " + .status + "  " + .commit[0:7]'

# Check runs (this is what draws the ✓)
gh api repos/xiang1103/xiang1103.github.io/commits/<sha>/check-runs \
  --jq '.check_runs[] | .name + "  " + .status + "  " + (.conclusion // "-")'

# Block until the build finishes
until [ "$(gh api repos/xiang1103/xiang1103.github.io/pages/builds/latest --jq .status)" != "building" ]; do sleep 10; done
```

### "I pushed but the site looks the same"

Check in this order — the answer has never been "the push failed":

1. **Is the build still queued or running?** `pages/builds/latest`. Most common cause.
2. **Browser cache.** Pages serves assets with `cache-control: max-age=600`, so a stale
   `style.css` can persist for ten minutes. Hard-reload (Cmd-Shift-R) or check with
   `curl -s https://xiang1103.github.io/ | grep hero__photo` — curl bypasses the cache.
3. **Confirm what is actually deployed**, not what you expect:
   `curl -sI https://xiang1103.github.io/assets/css/style.css | grep last-modified`.
4. Only then suspect the build. `pages/builds/latest` carries `.error.message` when it fails.

### git note

The local `origin/main` ref goes stale if nothing fetches it, so `git status` can claim
"up to date" without proving anything about the remote. `git ls-remote` needs the SSH key,
which is not available to the agent's shell — use `gh api .../commits/main` instead, which
goes over HTTPS with the `gh` token.

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
  ~`0.5rem` gap. Comes from `_config.yml` (`tagline`).
- **Hero photo** — sits to the right of the h1, from `_config.yml`'s `hero_image`. It shows
  the **whole frame, uncropped**: fixed width (`clamp(112px, 14vw, 168px)`), `height: auto`,
  6px corners. No `object-fit: cover` and no circular mask — the first version used both and
  cut the top of the head off. Keep the `width`/`height` attributes matching the file's real
  pixel dimensions (480x640) so nothing shifts as it loads. Below 560px it moves above the
  heading, left-aligned.
- **h2 section headings** — `1.3rem`, weight 700, `margin-top: 3rem`, sits noticeably closer
  to its own content than to the section above.
- **Body** — `1.0625rem`/`1.7`. Comfortable, not cramped.
- **Timeline rows** — the signature component, a 2-column grid per entry:
  - left: date/label in **monospace**, `0.875rem`, muted, top-aligned, fixed `7.5rem` column;
  - right: the text, which may start with an accent **bold link** ("Professional chef:")
    followed by prose;
  - `row-gap: 1.5rem` between entries.
  Data-driven from `_data/news.yml`, so an entry can also carry a tag, a thumbnail, and
  link buttons — see §6.4.
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

- **Content parity.** Everything that was in the original `index.md` must still render:
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

### 6.1 Where things live

| Path | Role |
|---|---|
| `index.html` | Thin entry point. Front matter only; its body is an optional free-form slot rendered between the hero and the first section. **Content no longer lives here.** Jekyll needs a root page, so it cannot simply be deleted. |
| `_sections/*.md` | One file per page section. See §6.3 for the front matter contract. |
| `_data/news.yml` | Timeline entries (date, body, optional tag/image/links). |
| `_data/nav.yml` | Nav items that are **not** sections (external links, downloads). Section links generate themselves. |
| `_layouts/homepage.html` | Head, sidebar, hero, sections loop, closing lines. |
| `_includes/section.html` | Renders one section from its front matter; dispatches on `variant`. |
| `_includes/sections/timeline.html`, `cards.html` | Variant renderers. |
| `_includes/figure.html` | Figure with optional caption and float side. |
| `_includes/icons/*.svg` | Inline SVG icons, `fill`/`stroke: currentColor`. |
| `_sass/tokens.scss` | All color, type, spacing, and layout tokens. Nothing else declares a hex. |
| `_sass/base.scss` | Reset and element defaults (styles markdown output). |
| `_sass/layout.scss` | Page shell only: `.page`, `.sidebar`, `.main`. |
| `_sass/components.scss` | Every component **and its own breakpoints** (§6.4.1). |
| `assets/css/style.scss` | Front-matter stub that imports the four partials in order. |
| `assets/js/theme-toggle.js` | The only JavaScript file. |
| `assets/img/xiang-hero.jpg` | 400px square hero photo. `avatar-xiang.jpg` is the 96px sidebar mark. Both cropped from `IMG_4275.jpeg`, which stays as the original. |

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

### 6.3 Page architecture: the `_sections` collection  **[BUILT]**

The homepage is **composed**, not rendered from one markdown file. `index.html` no longer
holds the content; it is a thin entry point whose body is an optional free-form slot.

```
_config.yml         collections: { sections: { output: false } }
_sections/*.md      one file per section, ordered by `order` (10, 20, 30 ...)
_layouts/homepage.html   hero, then loops the sorted collection
_includes/section.html   renders ONE section from its front matter
_includes/sections/*.html  variant renderers (timeline, cards, ...)
_data/*.yml         entries for data-driven variants
```

`output: false` keeps sections from becoming standalone pages. Collections are core Jekyll,
so this all works on GitHub Pages with no plugin.

**Why:** a section can be prose, a data-driven component, a hand-authored graphic, a custom
include, or any mix — without touching the layout, and without hand-writing HTML into
someone's prose. Adding a "Projects" section is a `_data/projects.yml` plus a six-line
`_sections/40-projects.md`; its nav entry appears automatically.

#### Section front matter contract

| Key | Meaning |
|---|---|
| `order` | Sort position on the page. Leave gaps (10, 20, 30) so sections can be inserted. |
| `title` | The `<h2>`, and the source of the anchor id. |
| `anchor` | Override the anchor id. **Never use `id`** — Jekyll already sets `id` on every collection document (`/sections/10-about`), so an `id` key here is silently ignored. This cost a debugging cycle. |
| `nav` | Sidebar nav label. Omit to keep the section off the nav. |
| `icon` | Nav icon; matches a file in `_includes/icons/`. |
| `heading` | `false` renders the section with no visible `<h2>`. |
| `variant` | `prose` (default) · `timeline` · `cards`. |
| `data` | Name of a `_data/*.yml` file supplying entries to the variant. |
| `include` | Path under `_includes/` rendered after the body — the escape hatch for a chart, diagram, or interactive component. |
| `media` | `{ src, alt, caption, side }` floating figure. |
| `class` | Extra classes on the `<section>`; `section--wide` opts out of the reading measure. |
| `reveal` | `true` opts the section into the CSS-only fade-in (§6.6). |

The file body is markdown and **may contain raw HTML and inline SVG**. Kramdown does not
parse markdown *inside* a block-level HTML tag unless that tag carries `markdown="1"`.

#### Adding things later

- **A new section**: drop a file in `_sections/` with an `order`. Nav updates itself.
- **A graphic in a section**: `media:` for a figure, or inline `<svg>` in the body.
- **A repeating component** (projects, talks, publications): a `_data/*.yml` plus
  `variant: cards`, or a new variant include if the shape is different.
- **Something bespoke** (chart, canvas, widget): write `_includes/whatever.html` and point
  `include:` at it. Jekyll 3.x cannot take a variable include name *with* parameters, so a
  custom include receives no params — read from `site.*` or `site.data.*` instead.
- **Animation**: `reveal: true`, or scoped CSS. Keep §0 in mind: no JS unless it earns its
  place, and always honor `prefers-reduced-motion`.

#### Liquid gotchas hit while building this

- `site.data[section.data].main` **cannot** appear inside an `{% include %}` parameter on
  Jekyll 3.x — resolve it with `{% assign %}` first. Same for a variable include name.
- Anchors come from `title | slugify`, and the nav is generated from the same collection, so
  a section and its nav link cannot drift apart. Renaming a `title` silently changes its
  URL fragment — deliberate, but worth knowing if a link is shared.

### 6.4 Timeline: how it works now, and the trap that is gone  **[BUILT]**

News lives in `_data/news.yml` and is rendered by `_includes/sections/timeline.html`, so each
entry is real markup: a date in the left gutter (`.timeline__date`), and a body that can
carry a tag, a thumbnail, markdown prose, and link buttons.

**Historical note, so nobody reinvents it:** the first version styled the plain markdown list
straight out of the old `index.md`, using the leading `<strong>` as the date label. Two approaches
were tried and both were bad:

1. `display: grid` on the `<li>` — **broken**. Grid promotes *every* inline child to its own
   grid item; only bare text runs are merged into anonymous items. Entries containing links
   scattered their `<a>` elements into the date column. Three of five entries broke.
2. Absolute-positioning the `<strong>` into a gutter — worked, but silently depended on
   every entry starting with `**bold**`, and could never hold a thumbnail or a button.

The data file removes the constraint instead of working around it. **Do not reintroduce
either hack.**

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

### 6.6 Motion policy  **[BUILT]**

Animation is allowed but must stay cheap and optional. The one built-in is `.reveal`: a
fade-and-rise driven by `animation-timeline: view()`. It costs **zero JavaScript**, is
wrapped in `@supports` so unsupporting browsers simply show the content, and sits inside
`@media (prefers-reduced-motion: no-preference)`.

Opt a section in with `reveal: true`. Before adding any *other* animation:

- CSS first. Scroll-driven timelines and transitions need no JS.
- If it truly needs JS, it goes in its own file loaded `defer`, and the page must be
  complete and correct without it.
- Always guard with `prefers-reduced-motion`.
- Nothing that blocks reading, moves text while it is being read, or delays first paint.

The planned `nav-active.js` (IntersectionObserver highlighting the in-view section) was
**dropped**: JS that doesn't earn its place on a page this short.

### 6.7 Verification checklist (before every push)

- [ ] `bundle exec jekyll serve` builds with no warnings
- [ ] Desktop ≥1280px, tablet ~900px, phone 375px — no horizontal scroll
- [ ] Light + dark, both automatic and via the toggle; no flash on load
- [ ] Sidebar stays put while main scrolls; nav anchors land correctly
- [ ] Every link in `_sections/` and `_data/news.yml` resolves, including both PDFs
      (spaces/parens URL-encoded)
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
- [ ] Hero photo size: currently `clamp(96px, 12vw, 132px)`, circular. Bigger? Square?
- [ ] Decorative graphic bottom-right of main — include one, and if so what?
- [ ] A separate **Research** or **Projects** section? The `cards` variant is built and
      unused — this is now a `_data/projects.yml` plus a six-line `_sections/` file.
- [ ] Keep the Grateful Dead motto and the obfuscated email in the sidebar?
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
- **2026-09-06** — **Page rearchitected for extensibility** at the user's request: the
  homepage must be able to grow graphics and animation, which one markdown file cannot
  support. Content moved out of `index.md` (verbatim) into the `_sections` collection;
  News moved into `_data/news.yml`. Added `_includes/section.html` (front-matter-driven
  renderer), `timeline.html` and `cards.html` variants, `figure.html`, a `.reveal`
  CSS-only motion utility, and section building blocks (`.tag`, `.btn`, `.cards`,
  `.figure`, `section--wide`). Sidebar nav now generates from the section list.
  Hero photo added beside the h1 (`hero_image`, 400px square crop; stacks above the
  heading below 560px).
  All capabilities were smoke-tested with a temporary section exercising cards + figure +
  custom include + reveal, and a news entry with tag/thumbnail/buttons; fixtures removed
  after verification.
  Two bugs found and fixed in the process: `id` in section front matter is shadowed by
  Jekyll's own document `id` (use `anchor`), and the mobile hero rule hit the
  §6.4.1 import-order trap again.
  **Not committed** — working tree only.
- **2026-09-06** — **Deploy pipeline understood and documented (§4.5).** User reported "I
  pushed but nothing changed and there is no check mark." Investigation: both commits were
  committed *and* pushed (remote `main` = `e2bdc09`), the earlier build (`24b69d6`) had
  already deployed successfully, and the live site was serving the redesign. The missing
  check mark was simply a build that had not started yet — check *runs* do not exist until
  the workflow begins, and `/commits/<sha>/status` always reports `pending` with zero
  statuses for this repo because Pages reports via check runs, not commit statuses.
  Contributing factor: Pages serves assets with `cache-control: max-age=600`, so a stale
  stylesheet can survive ten minutes in the browser after a successful deploy.
  No code was wrong; the hero photo was already committed in `e2bdc09`.
- **2026-09-06** — **Cleanup and hero fix.** Hero photo now shows the full uncropped frame
  (480x640, `height: auto`, 6px corners) instead of a 400px square center-crop masked into
  a circle, which cut off the top of the head.
  `index.md` renamed to `index.html` — it holds no content any more, but **a root page file
  is mandatory**, so it could not simply be deleted; deleting it outright would 404 the site.
  Deleted: `html_source_file/`, `mkdocs.yml`, and `CNAME` (empty, and the Pages API reports
  `cname: null`, confirming it configured nothing — checked *before* deleting, since a
  populated CNAME is how a custom domain is stored).
  Replaced the favicons: they were still minimal-light's "m" logo. Now a teal "x" mark,
  light and dark variants.
  `README.md` rewritten — it was the upstream theme's README, describing files this repo no
  longer has.
  `IMG_4275.jpeg` (1.2 MB) added to `exclude`: kept in the repo as the crop source but no
  longer published. The built site is now 9 files.
  `LICENSE` (CC0, from minimal-light) deliberately kept — deleting it would leave the repo
  unlicensed, which is a separate decision for the user to make.

