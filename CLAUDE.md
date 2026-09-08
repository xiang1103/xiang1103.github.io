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
| `_includes/sections/timeline.html`, `showcase.html`, `cards.html`, `skills.html` | Variant renderers. |
| `_includes/markdownify.html` | Markdown → HTML with every link opened in a new tab. Every markdownified string on the site goes through it (§6.8). |
| `_includes/figure.html` | Figure with optional caption and float side. |
| `_includes/icons/*.svg` | Ten inline SVG icons, `currentColor`. |
| `_sass/tokens.scss` | Every color, type, spacing, and layout token. Nothing else declares a hex. `--measure` is the fluid content width and the whole page follows it. |
| `_sass/base.scss` | Reset and element defaults; styles markdown output. |
| `_sass/layout.scss` | Page shell only: `.page`, `.sidebar`, `.main`. |
| `_sass/components.scss` | Every component **and its own breakpoints** (§6.4.1). |
| `assets/css/style.scss` | Front-matter stub importing the four partials in order. |
| `assets/js/theme-toggle.js` | The only JavaScript on the site. |
| `assets/img/xiang-hero.jpg` | 480x640, the full uncropped photo shown beside the h1. |
| `assets/img/mars-mark.png` | 96px copy of `mars_icon.png`, the 34px mark next to the wordmark. |
| `assets/img/projects/*` | Project media for the Projects showcase. Conventions — folder, format, width, weight, `shape:` — are documented at the top of `_data/projects.yml`; §6.4.2 has the short version. |
| `assets/img/tech/*.svg` | Vendor logos for Skills pills, from [Devicon](https://devicon.dev) (MIT). Referenced as `<img>`, never inlined — see §6.5.1. |
| `assets/img/mars_icon.png` | Full-size source for the mark. |
| `assets/img/IMG_4275.jpeg` | 1.2 MB original. Kept as the source for re-cropping, **excluded from the build** so it is never published. |
| `assets/img/favicon.png` | The Mars mark at 64px. One icon for both themes — the layout only emits a light/dark pair if `favicon_dark` is set. |
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
7. **Social icon row** — monochrome inline SVG icons, ~20px, muted; hover → accent. Driven
   by `_config.yml` link keys, each wrapped in an `{% if %}` so deleting a key removes the
   icon. Currently email (`mailto:`), GitHub, LinkedIn.
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
- **Pills (`.tag`)** — the shared "bubble": fully rounded, mono, accent text on
  `--accent-soft` (the accent tinted into the page background). Used by Skills groups,
  Project tags, and Experience entry skills, so they read as one system. A wrapping row of
  them is `.pills`. Contrast verified: 5.1:1 light, 7.2:1 dark.
- **Links** — accent color, `text-decoration: underline` with `text-underline-offset: 2px`
  and a thin `text-decoration-thickness`. Bold when the link is a "title" inside a timeline
  row (that's just how the markdown is authored). Hover: darker accent + thicker underline.
  **Every link on the site opens in a new tab**, including the ones written as
  markdown in a section body or a bullet. That is done at build time by
  `_includes/markdownify.html`, not by JavaScript — see §6.8. The two exceptions
  are the on-page `#anchor` links and `mailto:`, which stay in the tab.
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
--border-strong a heavier, browner hairline for the one place an outline has to
                be *found* rather than felt: the link buttons
--highlight     the site's second color: a warm vermilion taken from the Mars
                mark. Currently the hover state of an entry (§6.9)
--hover-bg      the wash behind a hovered Experience/Project entry (§6.9)
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
| `_includes/sections/timeline.html`, `showcase.html`, `cards.html`, `skills.html` | Variant renderers. |
| `_includes/markdownify.html` | Markdown → HTML with every link opened in a new tab. Every markdownified string on the site goes through it (§6.8). |
| `_includes/figure.html` | Figure with optional caption and float side. |
| `_includes/icons/*.svg` | Inline SVG icons, `fill`/`stroke: currentColor`. |
| `_sass/tokens.scss` | All color, type, spacing, and layout tokens. Nothing else declares a hex. |
| `_sass/base.scss` | Reset and element defaults (styles markdown output). |
| `_sass/layout.scss` | Page shell only: `.page`, `.sidebar`, `.main`. |
| `_sass/components.scss` | Every component **and its own breakpoints** (§6.4.1). |
| `assets/css/style.scss` | Front-matter stub that imports the four partials in order. |
| `assets/js/theme-toggle.js` | The only JavaScript file. |
| `assets/img/xiang-hero.jpg` | 480x640 hero photo, cropped from `IMG_4275.jpeg` (kept as the original). |
| `assets/img/mars-mark.png` | 96px sidebar mark, resized from `mars_icon.png`. |

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
| `variant` | `prose` (default) · `timeline` · `showcase` · `cards` · `skills`. |
| `data` | Name of a `_data/*.yml` file supplying entries to the variant. |
| `include` | Path under `_includes/` rendered after the body — the escape hatch for a chart, diagram, or interactive component. |
| `media` | `{ src, alt, caption, side }` floating figure. |
| `class` | Extra classes on the `<section>`; `section--wide` opts out of the reading measure. |
| `reveal` | `true` opts the section into the CSS-only fade-in (§6.6). |

The file body is markdown and **may contain raw HTML and inline SVG**. Kramdown does not
parse markdown *inside* a block-level HTML tag unless that tag carries `markdown="1"`.

#### Current page structure

| Order | File | Section | Variant | Data | Icon |
|---|---|---|---|---|---|
| 10 | `10-about.md` | About Me | prose | — | `user` |
| 20 | `20-experience.md` | Experience | timeline | `experience.yml` | `experience` |
| 30 | `30-projects.md` | Projects | showcase | `projects.yml` | `projects` |
| 40 | `40-leadership.md` | Leadership | prose | — | `sparkle` |
| 50 | `50-skills.md` | Skills | skills | `skills.yml` | `skills` |
| — | `_data/nav.yml` | Resume (external) | — | — | `file` |

Orders leave gaps of ten so a section can be slid in between two others without
renumbering everything. The nav renders in this same order, with `_data/nav.yml`'s
external items appended last.

#### Adding things later

- **A new section**: drop a file in `_sections/` with an `order`. Nav updates itself.
- **A graphic in a section**: `media:` for a figure, or inline `<svg>` in the body.
- **A repeating component** (projects, talks, publications): a `_data/*.yml` plus
  `variant: cards`, or a new variant include if the shape is different.
- **The `skills` variant**: labelled rows of pills from `_data/skills.yml`
  (`{label, items: [...]}` per group). An item is either a plain string or
  `{name, icon}`, where `icon` names a file in `assets/img/tech/` — see §6.5.1.
- **The `showcase` variant**: media in the left gutter, write-up beside it, from
  `_data/projects.yml` — see §6.4.2. Use it when each entry has a picture. The
  `cards` variant (a responsive grid of stacked cards) is still there for a
  section where entries are small and numerous rather than described at length.
- **The `timeline` variant** also takes optional `role` and `org` per entry, rendering a
  bold "Role · Organisation" line above the body — the shape Experience entries want once
  they describe positions rather than announcements.
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

### 6.4 Timeline / Experience entries  **[BUILT]**

`_includes/sections/timeline.html` renders `_data/experience.yml`. The layout follows
[brittanychiang.com](https://brittanychiang.com)'s experience list — **its structure only;
the palette and type stay ours**:

```
SUMMER 2025   Undergraduate Researcher · URECA, Stony Brook University ↗
              › Accepted into the URECA Summer Research Program ...
              › Using Diffusion Models to assist plan execution of robots ...
              (Diffusion Models) (Robotics) (Simulation)     <- pills
              [ Report ]                                     <- link buttons
```

Every part except `date` is optional, so an entry works as a bare line of text *or* a full
role listing:

| Field | Renders as |
|---|---|
| `date` | the gutter label, uppercased in CSS (`2024 — Present`, `Summer 2025`) |
| `role` | bold `<h3>` heading line |
| `org` | appended after a `·` |
| `org_url` | makes the org a link with an outbound arrow |
| `previous_roles` | list of earlier titles at the same org, muted, under the heading |
| `body` | markdown paragraph, for an entry that wants prose |
| `points` | list of short markdown lines → chevron bullets (the normal case) |
| `skills` | list of strings → a wrapping row of `.tag` pills |
| `links` | list of `{label, href}` → small `.btn` buttons |
| `tag`, `image`/`alt` | small label above the heading; thumbnail |

The gutter is `9rem` wide (was `7.5rem`) to fit date *ranges*. Below 480px the whole item
becomes a block and the date sits on its own line above the role.

**Historical note, so nobody reinvents it:** the first version styled a plain markdown list
straight out of the old `index.md`, using the leading `<strong>` as the date label. Two
approaches were tried and both were bad:

1. `display: grid` on the `<li>` — **broken**. Grid promotes *every* inline child to its own
   grid item; only bare text runs are merged into anonymous items. Entries containing links
   scattered their `<a>` elements into the date column.
2. Absolute-positioning the `<strong>` into a gutter — worked, but silently depended on
   every entry starting with `**bold**`, and could never hold a thumbnail or a button.

The data file removed the constraint instead of working around it, which is exactly what
made the role/pill layout above a template change rather than a rewrite. **Do not
reintroduce either hack.**

#### Bullets

Entries are **bullets, not paragraphs** — `points:` in the data file, one idea per
line, so an entry can be scanned. The marker is a **mono chevron `›` in the accent
color**, set once as `--bullet` in `tokens.scss`; changing that one token restyles
every list on the site (`"\2192"`, `"//"`, and `"\2014"` all work with JetBrains
Mono). It echoes the `↗` on outbound links and the `·` between a role and its org,
so the punctuation of the page reads as one set.

The marker is an absolutely-positioned `::before`, not `::marker` or a
`list-style-image`: Safari only honors a handful of properties on `::marker` and
will not take the monospace family, and a list-style-image cannot inherit the
accent color across themes. `padding-left: 1.15rem` on the `<li>` keeps wrapped
lines flush with the first.

The same rule covers `.prose ul` (excluding `.pills`), so Leadership's markdown
list and Experience's bullets match without either file knowing about the other.
A markdown list anywhere on the site gets the chevron for free.

### 6.4.2 Projects / the `showcase` variant  **[BUILT]**

The mirror image of the timeline: **media in the left gutter, the write-up
beside it.** Both sit in the same `--gutter` column, so Experience's dates,
Projects' pictures, and Skills' group labels line up down the whole page — that
alignment is most of what makes the layout read as one design, and it is why the
media column is a modest 13rem rather than as wide as a picture might like.
Change `--gutter` in `tokens.scss` and all three move together; that token is
the *only* way to resize a project image, by design.

```
[  image  ]   URECA 2025                      <- tag
[ or video]   Diffusion Models for Robots ↗   <- title, optional href
              A paragraph, or chevron bullets.
              (PyTorch) (Robotics)            <- pills
              [ Poster ] [ Code ]             <- link buttons
```

Entry fields: `title` (required), `href`, `tag`, `body`, `points`, `image`/`alt`,
`video`/`poster`, `size`, `skills`, `links`. `points` renders with the same `.bullets`
chevrons as Experience, so the two sections describe work the same way.

Two details worth keeping:

- **The frame hangs 1.1rem below the top of the row**, so its top edge lines up
  with the **first line of body text**, not the title. Level with the row it
  reads as *higher* than the title, because the frame's top is a hard edge while
  the title's cap starts about 0.5rem down inside its own leading. The two
  landmarks: `0.5rem` = level with the title's cap, `1.1rem` = level with the
  body text. Zeroed below 640px, where the media stacks above the write-up and
  has no title to hang under.
- **Nothing is cropped.** A picture fills the column's width and keeps its own
  proportions, so rows vary in height — that is the intended behaviour, not a
  gap to close. Cropping was tried first (a fixed `aspect-ratio` with
  `object-fit: cover`, plus a `shape:` field offering 16:9 / square / 3:4 / no
  crop) and rejected by the user: a project picture is usually a figure, a plot,
  or a screenshot whose edges carry meaning, and losing them to keep the column
  even is a bad trade. **Do not reintroduce it.**
- **The cost of not cropping is a possible layout shift**, since the row's height
  is unknown until the file arrives. That is what `size: "640x363"` is for: the
  include turns it into `width`/`height` attributes, the browser reserves the
  right box, and nothing jumps. Optional, but §0 asks for it.
- **Image conventions live at the top of `_data/projects.yml`**, next to where
  someone adding a project will be typing: `assets/img/projects/`, kebab-case
  names, `.jpg` for photographic content and `.png` only for flat color or crisp
  text, 640px wide, roughly landscape, under 150 KB, `size:` filled in, always an
  `alt`. The first real image made the format rule concrete — the same picture
  was 367 KB as a PNG and 69 KB as a JPEG at the same width.

**Missing media does not leave a hole.** If no entry in the section has a picture,
every entry spans the full width and the section looks exactly as it did before
pictures existed. As soon as *any* entry has one, the ones that don't keep the
gutter empty instead, so all the titles stay in the same column. That is the
`showcase--aligned` class, set by a pre-pass over the entries in the include.

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

### 6.5.1 Vendor logos in Skills pills  **[BUILT]**

Skills pills can carry a technology logo:

```yaml
- label: Software Engineering
  items:
    - name: Python
      icon: python      # -> assets/img/tech/python.svg
    - Computer Vision   # a plain string is a text-only pill
```

Logos come from **[Devicon](https://devicon.dev)** (MIT), fetched straight into the repo:

```bash
curl -sf https://raw.githubusercontent.com/devicons/devicon/master/icons/<name>/<name>-original.svg \
  -o assets/img/tech/<name>.svg
```

Thirty-three are vendored. Any other name from devicon.dev can be added the same way.

When Devicon does not have a mark (Databricks, Hugging Face, Claude), fall back to
[Simple Icons](https://simpleicons.org) (CC0). Those ship **unfilled**, so they default to
black and vanish in dark mode — paint them their brand color on the way in:

```bash
curl -sf https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/<slug>.svg \
  | sed 's|<svg |<svg fill="#<HEX>" |' > assets/img/tech/<name>.svg
```

The official hex for each brand is in simple-icons' own `data/simple-icons.json` — look it up
there rather than eyeballing it.

**Dark-mode legibility:** some marks are dark-on-transparent and disappear on the dark theme
— AWS's navy wordmark reduces to a floating orange swoosh, Next.js is a black disc. Setting
`chip: true` on the item gives the logo a small white backing **in dark mode only**. A CSS
filter was rejected: `invert()` wrecks brand colors (AWS's orange turns blue), whereas a
white chip keeps every logo exactly the color it should be.

**They are `<img>`, not inlined SVG — deliberately, and against the pattern used by every
other icon on the site:**

1. **Size.** Devicon's Linux logo is **192 KB** of path data for a 14px badge. Inlining a
   handful of these would dwarf the 19 KB page. As `<img>` they are separate, cacheable
   requests, and only the ones actually used are ever downloaded.
2. **Id collisions.** Several vendor SVGs carry `id=` attributes and `<style>` blocks
   (`python`, `nodejs`, `github`). Inlining two of those into one document risks duplicate
   ids and leaking styles; `<img>` isolates them.
3. They are brand-colored by design, so they gain nothing from `currentColor`.

That last point is also the one place the design deliberately ignores the palette.

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

### 6.9 Entry hover  **[BUILT]**

Hovering one Experience or Project entry lights that entry: a **wash behind both
columns**, and the two *muted* parts — the date and the heading — come up to
`--highlight`. **The body text does not change.**

**The highlight is vermilion, not the teal accent** — `#b03d1b` light,
`#ff8a68` dark. Links, pills and bullets inside these sections are already
`--accent`, so a teal hover would have added no information: the entry would go
from "some teal" to "more teal". The vermilion is sampled from the **Mars mark
in the sidebar** (core `#f94d30`, highlights `#fe8e79`), darkened until it
carries text, so the site's one existing non-teal color earns a second job
instead of a new hue being invented. It is also teal's complement, which is why
a lit entry reads as a *different state* rather than as emphasis of the same
kind.

That last part is the whole design. Turning a paragraph accent-colored would
"light it up" and make it harder to read at the same time, which defeats the
purpose; promoting the already-muted text to full attention says the same thing
and costs no legibility. Measured on `--hover-bg`: highlight 5.02:1 light /
7.12:1 dark (near the teal's 5.16 / 7.96, so the hover carries the same weight),
body text 14.6:1 / 13.5:1. The wash itself is 1.11:1 against the page in
both themes — enough to see, not enough to shout.

Four mechanics worth not breaking:

- **`--hover-bg` is its own token, and must stay warm.** It cannot be
  `--accent-soft`: that is exactly the pill background, so a wash in it would
  make the skill bubbles inside a hovered entry vanish completely. Even against
  `--hover-bg` the pills are only 1.01:1 by luminance — they separate by *hue*,
  cool green on warm cream, which is the same way they already read against the
  page (1.12:1 there). Checked at 2x on a real render, not assumed. A cooler or
  greener wash would break them; darkening the pills on hover to compensate was
  measured and rejected, since it drops the pill label under 4.5:1.
- **The padding is cancelled by an equal negative margin** (`var(--sp-3)` each
  way), so the wash bleeds past the text without moving a character. Both
  sections keep their `--gutter` alignment while hovered. The bleed is 16px
  against 64px/32px of `.main` padding on desktop and 24px on mobile, so it never
  reaches the edge.
- **The inter-entry margins were rebalanced, not added to.** The timeline's
  `margin-bottom` went `--sp-4` → `0` and the showcase's `--sp-5` → `--sp-1`,
  because 12px of hover padding at each end now supplies that gap. Spacing on the
  page is unchanged, and the hover targets are contiguous, so the wash cannot
  flicker off in the gap between two rows.
- **`@media (hover: hover)`** keeps a touch screen from leaving an entry stuck
  lit after a tap. `:focus-within` gives the same cue to keyboard users and is
  deliberately *outside* that guard.

Color only, 120ms, nothing moves or resizes — §0's transition budget exactly.

### 6.8 Links open in a new tab  **[BUILT]**

Every link on the site opens in a new tab. Three mechanisms, because links come
from three places:

- **Layout links** (socials, Source, the nav's Resume) carry
  `target="_blank" rel="noopener"` in `_layouts/homepage.html` by hand.
- **Data-driven links** (`org_url`, `links:` buttons) carry it in the variant
  includes, unconditionally.
- **Markdown links** — inside a section body, a `body:`, or a bullet — get it
  from **`_includes/markdownify.html`**, which is now the only thing that calls
  `markdownify`. It appends the attributes with a string `replace` on kramdown's
  `<a href="` and then puts back the two cases where a new tab is wrong:
  `#anchor` (an on-page jump; a new tab would reload the whole site to scroll)
  and `mailto:` (several browsers open a blank tab next to the mail client).

  Params: `text` (the markdown) and `inline` (strips the wrapping `<p>`, for a
  one-line string such as a timeline bullet).

Build time, not JavaScript: it costs nothing at runtime, works with JS disabled,
and the attribute is in View Source rather than appearing a tick after load. §0
allows one JS file and the theme toggle has it.

**If a new place ever renders markdown, call this include instead of the
`markdownify` filter**, or its links will quietly behave differently from the
rest of the page. `index.html`'s own body is the one gap — it is HTML, not
markdown, so a link hand-written there needs its own attributes.

Worth knowing: opening links in a new tab without warning is an accessibility
advisory (WCAG G201) — it takes the Back button away from the reader. That is
the user's explicit call, made deliberately.

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
- **2026-09-06** — X/Twitter icon replaced with a `mailto:` email icon
  (`xlxiangliu.13@gmail.com`) at the user's request. Set `email_link` in `_config.yml`;
  removed the `twitter` key and `_includes/icons/twitter.svg`.
  Note there are now **two addresses in the sidebar**: the mail icon opens a draft to the
  personal Gmail, while the obfuscated `xiang(dot)liu(dot)1(at)stonybrook.edu` still renders
  as text below the icons (`email` in `_config.yml`). That is deliberate — personal vs
  academic — but flagged so it is not mistaken for a duplicate. Unlike the obfuscated one,
  `email_link` appears in the page source in plain text and is scrapable.
- **2026-09-06** — Removed the duplicate **Resume** link from the sidebar's bottom link row
  (`.sidebar__links`); it is already a nav item in `_data/nav.yml`. That row is now just
  "Source", and the `a:not(:last-child)::after` separator correctly renders nothing.
  Side effect: `cv_link` in `_config.yml` is now **unused** — the nav entry carries its own
  URL-encoded path, since data files cannot read Liquid variables. Left in place rather than
  deleted because `_config.yml` had uncommitted user edits at the time; safe to remove.
- **2026-09-06** — Sidebar footer is now a single row: `email | Source`. The email moved from
  its own `<p>` into `.sidebar__links` as a `<span>`, and the separator selector widened from
  `a:not(:last-child)` to `> *:not(:last-child)` so it works between any two children.
  Two supporting changes were needed to keep it on one line at the narrowest sidebar: the
  separator spacing dropped from `--sp-2` to `--sp-1`, and `--sidebar-w`'s minimum went from
  240px to **260px** (240 minus 48px of padding left the row ~12px short, so it wrapped and
  stranded a dangling "|"). The email carries `white-space: nowrap` so it can never break
  mid-address; the row still wraps as whole items if a longer address ever overflows.
- **2026-09-06** — **Nav restructured for the portfolio the site is growing into:**
  About · Experience · Projects · Leadership · Skills · Resume.
  - `News` became **Experience** (`20-experience.md`, `_data/news.yml` -> `experience.yml`).
    Its five entries moved across **verbatim** — but they are still worded as news
    ("Accepted an offer...", "Completed my research class..."), not as positions. The
    `timeline` variant gained optional `role`/`org` fields for when they get rewritten.
  - **Projects** added (`cards` variant), seeded with the three pieces of work already
    described elsewhere on the site (URECA diffusion-models, CSE 487 molecule generation,
    SOAR climate forecasting) reusing their existing PDF and GitHub links. Nothing invented.
  - **Skills** added with a new `skills` variant: labelled rows of pills from
    `_data/skills.yml`. Only "Research areas" is populated, from terms already on the site;
    Languages / Frameworks / Coursework groups are **commented out in the data file** rather
    than guessed at, ready to uncomment.
  - `30-miscellaneous.md` renamed `40-leadership.md` (the user had already retitled it).
  - Three new icons drawn to the existing grid (24x24, `stroke-width: 1.75`, round caps):
    `experience` (briefcase), `projects` (layers), `skills` (sliders). `news.svg` deleted.
  Anchors and nav labels all derive from `title:`, so the five sections and their nav links
  regenerated themselves; nothing needed hand-syncing.
- **2026-09-06** — **Experience section restyled after brittanychiang.com** (layout only,
  palette and type unchanged). Each entry is now `date gutter | Role · Org ↗ / description /
  skill pills / link buttons`, via new optional `role`, `org`, `org_url`, `previous_roles`,
  and `skills` fields in `_data/experience.yml`. No layout or CSS architecture changed — the
  data-driven timeline absorbed it as a template edit.
  `.tag` became a proper pill (fully rounded, `--accent-soft` background) and gained a
  `.pills` row wrapper; Skills and Projects inherit the same bubble, so all three sections
  match. New `--accent-soft` token in both themes; contrast checked at 5.1:1 / 7.2:1.
  Date gutter widened 7.5rem -> 9rem for date ranges, and the labels are uppercased in CSS.
  **Content caveat:** the five entries were rewritten from news phrasing into role listings
  using only what the site already said — "Capital One's Technology Internship Program"
  became "Technology Intern · Capital One", and each entry's `skills` are the techniques its
  own description named. Titles and date ranges are restatements, not verified facts; the
  data file says so at the top.
- **2026-09-06** — Sidebar brand row: the 34px photo mark became the Mars icon the user
  supplied (`assets/img/mars_icon.png`, resized to `mars-mark.png` at 96px / 7 KB), and the
  wordmark changed from "xiang liu" to **xiang.dev**. Used the artwork directly rather than
  redrawing it as an inline SVG — the organic blob shapes would not survive a hand redraw,
  and it is one small raster in an otherwise SVG icon set.
  `avatar-xiang.jpg` deleted; the hero photo (`xiang-hero.jpg`) is unchanged, so the face is
  still on the page, just not in the sidebar.
  Note the icon's red sits against a teal accent. It reads as a deliberate brand mark rather
  than a palette clash, but the favicon is still the teal "x" — those two marks now differ.
- **2026-09-06** — Brand lockup tightened: `.brand` gap `--sp-2` (12px) -> `0.2rem`, so the
  Mars mark and "xiang.dev" read as one unit, plus `padding-left: var(--sp-2)` to sit the
  lockup off the sidebar's left edge. The theme toggle still pins right.
  Favicon is now the Mars mark too (64px), replacing the teal "x", so the tab and the
  sidebar match. `favicon-dark.png` deleted and `favicon_dark` removed from `_config.yml`:
  the mark carries its own color and reads on light and dark tab bars, so the per-theme pair
  was redundant. The layout keeps the pair path — set `favicon_dark` again to restore it.
  (Checked first: the artwork has only 8px of transparent margin on a 512px canvas, so the
  visible gap really was the CSS gap, not padding baked into the image.)
- **2026-09-06** — The wordmark link now scrolls to the top instead of re-navigating:
  `href="/"` -> `href="#top"`. **"top" is a special fragment in the HTML spec** — with no
  element of that id, it means the top of the document — so this needs no JS and no
  `id="top"` anywhere, and the smooth scroll comes from `base.scss`'s existing
  `scroll-behavior` (already inside a `prefers-reduced-motion` guard).
  Verified in a browser, not assumed: from `scrollTop: 1500` a click lands at `0` with the
  document never re-created (a marker set on `window` survived the click).
  Cost avoided per click: a ~100-130ms round trip for 19 KB of HTML plus revalidation of the
  stylesheet, script, and two images, then a full parse/style/layout/paint and a re-run of
  the inline theme script. Small in absolute terms, but it is the difference between an
  instant scroll and a page blink.
  **Coupled to being a single page:** if the site ever gains a second page, this must go back
  to `href="/"`, or the wordmark will strand visitors on whatever page they are on. Noted in
  a comment on the link itself.
- **2026-09-06** — Content width is fluid: `--measure` went from a fixed `46rem` to
  `clamp(46rem, 58vw, 58rem)`, so a wide window is used instead of sitting empty. Everything
  follows that one token — hero, sections, timeline, cards, motto — so the layout is
  identical at every size, only wider.
  Chosen from four options after showing the user the tradeoff in characters per line: at
  1440px the column is ~835px (~97 chars), capping at 928px (~108 chars) from 1920px up.
  A cap exists on purpose. Line length past roughly 100 characters is measurably harder to
  read, and the alternative (no cap) reaches ~255 characters on a 2560px display. Raise the
  58rem ceiling to fill more; delete it to fill the window entirely. The comment on the
  token records these numbers.
- **2026-09-06** — Measure widened again at the user's request: `clamp(46rem, 58vw, 58rem)`
  -> `clamp(46rem, 62vw, 66rem)` (+8rem of ceiling). 1440px now gives ~893px (~104 chars per
  line), capping at 1056px (~123 chars) from 1920px up — past the comfortable reading range,
  chosen deliberately to use the space.
  With the extra room, the timeline gutter gap went `--sp-4` (1.5rem) -> `--sp-6` (3rem), so
  the date reads as its own column rather than as part of the entry. `.skills__group` got
  the same gutter and gap so its labels line up with the experience dates across sections.
  Also folded away a redundant override: `.timeline__item` and `.skills__group` each declared
  `grid-template-columns: 7.5rem 1fr` and were then overridden to `9rem 1fr` further down the
  file. The 9rem is now declared once, in each base rule.
- **2026-09-06** — **Content now fills the window.** The previous widening was real but
  looked like nothing had changed, because on a 1440-1512px laptop the column was already
  close to full; the empty space only showed at 1920px and up, where the *cap* was binding.
  Measured before (`clamp(46rem, 62vw, 66rem)`): 1440 -> 893px content, 119px unused;
  1920 -> 1056px, **436px unused**; 2560 -> 1056px, **1076px unused**.
  Now `clamp(46rem, 82vw, 132rem)`: 1440 -> 1044px, 1920 -> 1524px, 2560 -> 2099px, with
  **0px unused** up to 1920 and 33px at 2560. The 132rem ceiling only engages past ~3200px,
  so in practice the vw factor governs — that is the knob to turn, not the ceiling.
  Lines are long by typographic standards at this width (~175 chars at 1920). That is the
  user's explicit call, made twice; the tradeoff is recorded on the token.
  `.hero__text` changed from `flex: 1 1 auto` to `flex: 0 1 46rem`, because a growing hero
  pushed the photo to the far right edge and stranded it ~1300px from the heading. With a
  basis instead of grow, the photo sits just after the text at any width.
  **Method note:** measured rendered widths in a real browser (a same-origin page that loads
  the site in iframes at six viewport widths and reports `getBoundingClientRect`) rather than
  reasoning about the clamp. That is what caught both the "no visible change" cause and the
  hero problem.
- **2026-09-06** — Skills gained **Software Engineering** and **Machine Learning** rows with
  vendor logos, on top of the existing text-only Research areas row. `_includes/sections/
  skills.html` now accepts either a plain string or `{name, icon}` per item, so both styles
  mix in one section. New `.tag--logo` / `.tag__logo` styles; 24 Devicon SVGs vendored into
  `assets/img/tech/` (Linux dropped — 192 KB for a 14px badge).
  Shared gutter widened `9rem` -> `11.5rem` so "Software Engineering" and "June 2026 -
  August 2026" both fit on one line; Experience and Skills share the value so their columns
  stay aligned.
  **The two new lists are placeholders**, a plausible stack for a CS undergrad doing AI
  research rather than a record of what Xiang uses. The data file says so in a warning
  comment. This is the one thing the user has to supply.
- **2026-09-06** — Skills content curated by the user: C++ -> C, added R, HTML, CSS,
  TypeScript, Next.js, FastAPI, AWS, Databricks, MongoDB, MySQL and Claude to Software
  Engineering, Hugging Face to Machine Learning, and dropped the Research areas row.
  Logos enlarged 14px -> 16px.
  Eight new logos fetched: `r`, `nextjs`, `fastapi`, `mongodb`, `aws` from Devicon;
  `databricks`, `huggingface`, `claude` from Simple Icons, each painted its official brand
  hex (looked up in simple-icons' data file, not guessed) because Simple Icons ship unfilled
  and would render black.
  Added the `chip: true` per-item flag after previewing every new logo on both backgrounds:
  AWS, Next.js and MySQL were illegible on the dark theme. 32 logos are now vendored.
  Four entries (Docker, PostgreSQL, React, JavaScript) still come from the original
  placeholder set and were never explicitly confirmed — flagged in the data file.
- **2026-09-07** — Skills logos enlarged again, 16px -> 20px, with `.tag` padding nudged
  `0.15rem` -> `0.25rem` vertically so the pill grows with them instead of clamping. The
  `width`/`height` attributes on the `<img>` were updated to match the CSS, keeping the
  intrinsic size honest and avoiding layout shift as they load.
  Note the label text is still `0.6875rem`, so the logo is now nearly twice the cap height
  of its own text. That reads fine as a badge, but if the balance ever looks off, the pill
  font size is the thing to raise — not the logo.

- **2026-09-07** — **Experience entries became bullets.** Each entry was one
  paragraph; they are now `points:` lists in `_data/experience.yml`, rendered by a
  new `.timeline__points` list in the timeline include. `body:` still works and
  renders above the points, so an entry can be prose, bullets, or both.
  The marker is a mono `›` in the accent color, held in a new `--bullet` token —
  chosen over a disc because it matches the site's other punctuation (`↗`, `·`)
  and over `::marker` because Safari will not give `::marker` a font family.
  The rule also covers `.prose ul:not(.pills)`, so **Leadership's markdown list
  picked up the same bullet** — deliberate, so the two sections match; scope it to
  `.timeline__points` alone if the discs are wanted back there.
  **Content note:** the paragraphs were cut into bullets, and a few sentence seams
  were re-cut so each line stands alone ("Accepted into the URECA Summer Research
  Program with funding for my project on using Diffusion Models ..." became two
  lines). No facts changed, but the wording is worth a read — flagged at the top of
  the data file too.

- **2026-09-07** — Link buttons (`.btn`, e.g. "Poster") got their own hairline:
  a new `--border-strong` token, warmer and browner than `--border`
  (`#cdbb9f` light / `#4a4339` dark), about 1.8:1 against the page where the
  plain border is ~1.15:1. Kept at 1px — thickening a button that small reads as
  heavy rather than legible; the color does the work.
  Also documented in `_data/experience.yml`: `points` and `body` are markdown, so
  `[text](url)` links work inside a bullet. The YAML traps are written out there —
  a line starting with `[` or containing `: ` has to be quoted, and a local file
  path needs `%20`/`%28`/`%29` inside a markdown link (but not in a `links:` href).
  Verified all three forms through a real build, including the bracket-first case.

- **2026-09-07** — Link buttons (`links:` in a data file) now **always** open in a
  new tab. They used to do so only when the href contained `://`, which meant the
  external GitHub links opened in a tab but the local PDFs — Poster, Report —
  navigated the page away, losing the reader's scroll position. A button is an
  artifact, not a destination, so the rule is now unconditional in both
  `timeline.html` and `cards.html`.
  Markdown links inside `points`/`body` are deliberately left alone: those are
  prose links and behave like prose links.

- **2026-09-07** — **Every link on the site now opens in a new tab**, markdown
  links included. New `_includes/markdownify.html` is the single place markdown
  becomes HTML; it adds the attributes at build time and exempts `#anchor` and
  `mailto:` links. `section.html`, `timeline.html` (body *and* bullets) and
  `cards.html` all call it instead of the bare `markdownify` filter — see §6.8.
  Verified by auditing every `<a>` in the built page: 8 markdown links converted,
  11 already-tabbed links unchanged, and exactly three left in-tab — the five nav
  anchors, the `#top` wordmark, and the `mailto:`.

- **2026-09-07** — **Projects moved from `cards` to a new `showcase` variant**
  (§6.4.2): media in the left gutter, title and prose beside it — the timeline's
  layout with a picture where the date goes. New
  `_includes/sections/showcase.html` and a `.showcase` block in `components.scss`.
  Supports `image` or `video` (`preload="none"` + `poster`, so a clip is free
  until played), an optional `href` that links both the title and the media, and
  the same `points`/`skills`/`links` fields Experience uses.
  Two supporting changes:
  - **`--gutter: 11.5rem` is now a token.** Timeline, Skills and Showcase all read
    it, so the three sections cannot drift out of alignment. It was duplicated as
    a literal in two places before.
  - **`.timeline__points` renamed `.bullets`**, since Projects renders the same
    chevron list. Same CSS, shared name.
  The `cards` variant was kept, not deleted: a grid of small cards is still the
  right shape for a section with many short entries.
  Verified in a browser with test images in two of the three entries — including
  the mixed case, which is what `showcase--aligned` exists for — then reverted;
  no project has real media yet.

- **2026-09-07** — First real project image attached (Stanford Cars, on the URECA
  entry), and the media frame gained a **`shape:` convention** so future images of
  different proportions do not each need a CSS change: `wide` (16:9, default),
  `square`, `tall` (3:4), `full` (no crop). Written up in full at the top of
  `_data/projects.yml` — that is the file someone edits when adding a project, so
  the conventions live there rather than only here.
  The source PNG (685x388, 410 KB) was resized to 640px and re-encoded as JPEG at
  69 KB — an 83% saving on a picture that displays at ~184px. The original is kept
  and added to `exclude`, the same treatment `IMG_4275.jpeg` gets.
  **The layout order did not change**: media has been in the left gutter since the
  showcase variant was built. The user asked for left/right and that is what it
  already was.
  Open question the image raises: at `--gutter: 11.5rem` the picture displays
  ~184px wide, which is a thumbnail. Raising `--gutter` (16rem, say) enlarges it,
  but Experience's date column and Skills' labels move with it — that is the
  price of the shared alignment, and it is the user's call.

- **2026-09-07** — **Project images are never cropped.** The `shape:` field and
  the fixed-ratio `object-fit: cover` frame added earlier the same day were
  removed at the user's direction: a picture now fills the column's width, keeps
  its own proportions, and rows are simply different heights. The reasoning is
  sound and worth not relitigating — these pictures are figures and screenshots,
  and their edges are part of the content.
  The layout shift that cropping was buying is bought instead by `size:
  "640x363"` in the data file, which the include emits as `width`/`height`
  attributes. Cheaper, and it does not cost any pixels.
  What remains a convention rather than a mechanism: 640px wide, roughly
  landscape, `.jpg` for photographic content, under 150 KB. All of it is written
  at the top of `_data/projects.yml`, including a one-line `magick` command that
  produces a conforming file.

- **2026-09-07** — `--gutter` 11.5rem -> **13rem**, to make the project images
  bigger: 184px -> 208px wide. Measured rather than guessed, in a browser with
  the real page (each variant got an inline `--gutter` override so all four
  shared one stylesheet — copying the HTML alone does not work, since every copy
  loads the same `style.css`):
  | gutter | image | empty column after the widest date |
  |---|---|---|
  | 11.5rem | 184px | 26px |
  | **13rem** | **208px** | **50px** |
  | 14rem | 224px | 66px |
  | 16rem | 256px | 98px |
  13rem was chosen as the largest step that does not start detaching Experience's
  dates from their own text; the section was checked side by side at both values
  and reads the same. Compensating with a narrower `column-gap` on the timeline
  was considered and rejected: the content column would then start at a different
  x in Experience than in Projects, which is exactly the alignment the shared
  gutter exists to protect.

- **2026-09-08** — **Entry hover added to Experience and Projects** (§6.9): a
  `--hover-bg` wash behind the whole entry, with the date and the heading coming
  up to the accent. Body text is deliberately left alone — the request was for
  the entry to "light up" *and* stay easy to read, and recoloring a paragraph
  cannot do both.
  New `--hover-bg` token in all three theme blocks (`#f2ebdd` / `#221f18`). It
  could not reuse `--accent-soft`: that is exactly the pill background, and a
  hovered entry's skill bubbles would have vanished into the wash. Against
  `--hover-bg` the pills separate by hue rather than luminance (1.01:1) — the
  same way they already work against the page — which was checked at 2x on a
  real render, and is why the wash has to stay warm.
  The padding that gives the wash its bleed is cancelled by an equal negative
  margin, and the old inter-entry margins were reduced by the same amount, so
  neither the gutter alignment nor the vertical rhythm moved. Verified by
  rendering a forced hover state in both themes rather than trusting the CSS.

- **2026-09-08** — Hover highlight moved off the accent: new `--highlight` token,
  a warm vermilion (`#b03d1b` light / `#ff8a68` dark) **sampled from the Mars
  mark** rather than invented. The teal version was correct mechanically but said
  nothing — links, pills and bullets in Experience and Projects are already
  `--accent`, so a hovered entry went from some teal to more teal. Vermilion is
  teal's complement and already on the page in the sidebar, so it reads as a
  different *state* and still belongs to the palette.
  Contrast on the wash: 5.02:1 light, 7.12:1 dark — deliberately matched to the
  teal's 5.16 / 7.96 so the hover has the same visual weight it had before.
  The wash itself stays warm cream and unchanged; only the two text colors moved.

- **2026-09-08** — Project images hang `0.75rem` below the top of their row. They
  were level with the title's line box, which reads as too high: the frame's top
  is a hard edge, the title's cap is not — it starts ~0.5rem down inside the
  leading, so equal `y` looks unequal. The two useful landmarks are recorded in
  §6.4.2 (0.5rem = level with the title's cap, 1.1rem = level with the body
  text). Shipped at 0.75rem, between the two; the user then chose **1.1rem**, so
  the picture's top edge and the paragraph's first line share a line.
