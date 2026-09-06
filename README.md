# xiang1103.github.io

Personal website of Xiang Liu — [xiang1103.github.io](https://xiang1103.github.io/)

Static site built with Jekyll and deployed by GitHub Pages from `main`. No build
step, no framework, no JavaScript beyond a theme toggle.

## Editing the site

| I want to... | Edit |
|---|---|
| Change the heading, tagline, sidebar blurb, or links | `_config.yml` |
| Edit a section's text | the matching file in `_sections/` |
| Add a news entry | `_data/news.yml` |
| Add a whole new section | a new file in `_sections/` (nav updates itself) |
| Add a nav link that isn't a section | `_data/nav.yml` |
| Change colors, type, or spacing | `_sass/tokens.scss` |

Each file in `_sections/` is one block of the page. Its front matter decides how it
renders — prose, a data-driven timeline, cards, a figure, or a custom include — so a
section can hold graphics and components, not just markdown.

See **CLAUDE.md** for the full architecture, the section front-matter contract,
the design system, and the deploy pipeline.

## Running it locally

```bash
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"   # macOS system Ruby is too old
bundle install
bundle exec jekyll serve      # http://127.0.0.1:4000
```
