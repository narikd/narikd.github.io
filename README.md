# Project wiki

A personal wiki-style portfolio with an editorial look: a big black hero, a staggered grid of project cards, and a full-width cover on each project page. Plain HTML, CSS and JavaScript with no build step, so it runs on GitHub Pages as-is.

## Publish on GitHub Pages

1. Create a repository named **`your-username.github.io`** (replace with your GitHub username).
2. Upload everything in this folder to the root of that repo, including the hidden `.nojekyll` file.
3. In the repo go to **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`, and save.
4. After about a minute the site is live at `https://your-username.github.io`.

Using a different repo name (for example `wiki`) also works; the site will be at `https://your-username.github.io/wiki/`.

## Make it yours

Open `wiki.json`:

- `site`: your name, `location`, the big home-page `headline` (use `\n` for a line break), a short `intro`, your `email`, and `links`. Each link has a `label`, a `short` form for the top bar (e.g. `GH`), and a `group` used to group links in the footer.
- `about`: the large `statement` at the top of the About page, plus `groups` of short lists (experience, tools, recognition…) shown beside the About text.
- `categories`: the categories to use, in order.
- `projects`: one entry per project. This drives the Work grid, the Index table and each project's header.
- `pages`: extra pages. `about` is special; any others get a plain article layout.

### Project fields

| Field | Example | Notes |
|---|---|---|
| `slug` | `trail-weather` | Matches the file `content/projects/trail-weather.md` |
| `title` | `Trail Weather` | |
| `summary` | One sentence | Shown in the index and under the title |
| `category` | `Software` | Groups the sidebar |
| `status` | `active` | One of `active`, `ongoing`, `paused`, `complete`, `archived` |
| `started` / `updated` | `2026-03` / `2026-10-04` | `YYYY-MM` or `YYYY-MM-DD` |
| `role` | `Solo` | Optional |
| `stack` | `["Python", "pandas"]` | Optional |
| `tags` | `["web"]` | Clickable, filterable |
| `links` | `[{ "label": "Source", "url": "…" }]` | Optional |
| `cover` | `assets/img/trail.jpg` | Image for the card and the full-width project header |
| `color` | `#24463D` | Background shown behind the cover while it loads, or instead of it |
| `gallery` | `["assets/img/a.jpg", { "src": "assets/img/b.jpg", "caption": "…" }]` | Large images after the write-up |
| `featured` | `true` | Puts the project first on the Work grid |

### Writing

Write-ups are Markdown in `content/projects/<slug>.md`; pages are in `content/pages/<slug>.md`.

- `[[other-slug]]` links to another project or page; `[[other-slug|custom text]]` changes the link text.
- Every `##` and `###` heading shows up in an automatic contents box (when there are 3 or more).
- Pages that link to a project are listed under **Linked from** on that project.
- Code blocks with a language (```` ```python ````) get syntax highlighting.

## Preview on your computer

The site loads its Markdown with `fetch`, so opening `index.html` directly won't work. From this folder run:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Files

```
index.html            page shell
wiki.json             site settings and project list
content/projects/     one Markdown file per project
content/pages/        About and other pages
assets/css/wiki.css   styles (colors are variables at the top)
assets/js/wiki.js     routing, search, rendering
assets/vendor/        marked (Markdown) and highlight.js
assets/img/           covers and other images
```

## Views and keys

- **Work** (grid button): the visual gallery, newest first.
- **Index** (list button): a sortable table of every project, with status filters and tags.
- **Search** (magnifier, `/`, or Cmd/Ctrl+K): searches titles, write-ups, tags and tools.

The font is Satoshi, loaded from Fontshare. To change it, edit `--font` at the top of `assets/css/wiki.css` and the font link in `index.html`.
