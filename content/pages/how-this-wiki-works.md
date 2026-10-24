# How this wiki works

Everything on this site is plain files, with no build step.

## Add a project

1. Add an entry to the `projects` list in `wiki.json` (title, summary, status, tags…).
2. Create `content/projects/<slug>.md` with the write-up.
3. Optionally add a cover image to `assets/img/` and set `cover` and `color` on the project.
4. Commit and push. GitHub Pages publishes it in about a minute.

## Writing tips

- Link to another project with double brackets: `[[trail-weather]]` becomes [[trail-weather]].
- Headings (`##`) build the contents list automatically.
- Put images in `assets/img/` and reference them as `![alt text](assets/img/photo.jpg)`.
- Add a `gallery` list of image paths to a project to show large images after the write-up.

## Views

The grid button shows **Work**, the visual gallery. The list button shows the **Index**, a sortable table of every project with status filters and tags. Press `/` anywhere to search.
