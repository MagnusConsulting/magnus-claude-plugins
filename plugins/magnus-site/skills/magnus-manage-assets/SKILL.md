---
name: magnus-manage-assets
description: Add, replace, or remove static files in the Magnus Consulting website's public/ directory — team headshots, client logos, report PDFs, hero images, icons, favicons. Use when the user says "upload a photo", "replace the report PDF", "add a client logo", "swap the headshot for [name]", or "delete the old [file]". Saves files into public/<category>/<filename> with sensible naming, optionally wires the new path into a referencing data file (e.g. src/data/team.ts for a team photo), and writes an audit log entry when replacing gated content. NOT for code or content edits (use magnus-edit-page or the magnus-add-* skills).
---

# Magnus — Manage assets

You are adding, replacing, or removing static files (images, PDFs, SVGs, icons) under the Magnus website's `public/` directory. The skill is deliberately narrow — it handles binary assets, not code.

## Step 1 — Confirm working directory is the magnus repo

Verify `package.json` (with astro), `src/pages/`, and `docs/llm-context.md` are all present. If any are missing, offer to run **magnus-setup** or stop.

## Step 2 — Determine the operation

The user has one of three intents. Confirm which:

| Intent | Trigger phrases | What you'll do |
|---|---|---|
| **Upload** | "upload", "add a photo", "add a logo" | Save a new file under `public/<category>/` |
| **Replace** | "replace", "swap", "update the [photo / pdf]" | Overwrite an existing file at the same path |
| **Remove** | "delete", "remove", "take down" | Delete a file from `public/` (rare; usually only for legal takedowns) |

## Step 3 — Determine the category and target directory

Based on what the user is uploading, route the file to the correct subdirectory of `public/`:

| Asset type | Target directory | Allowed file types |
|---|---|---|
| Team headshot | `public/team/` | `.jpg`, `.jpeg`, `.png`, `.webp` |
| Client logo (carousel, testimonial) | `public/logos/` | `.svg`, `.png` (transparent), `.webp` |
| Report PDF (downloadable) | `public/reports/` | `.pdf` |
| Hero / feature image | `public/images/` | `.jpg`, `.jpeg`, `.png`, `.webp` |
| Icon / inline SVG | `public/icons/` | `.svg` |
| OG / social card | `public/og/` | `.jpg`, `.png` |
| Favicon update | root `public/` (matches existing favicon files) | `.ico`, `.svg`, `.png` |

If the user's intent doesn't fit any category, ask. Don't invent new directories silently.

If the target subdirectory doesn't exist yet, create it (`mkdir -p public/<dir>`). The first asset of a new type triggers the directory creation.

## Step 4 — Locate the source file

The user can supply the file in four ways. Pick the one that fits how the file arrives.

### 4a · Attached in chat (preferred — works everywhere including Cowork)

The user drops a file into the chat. Read the attachment as base64 and call the **`magnus_save_asset`** MCP tool — the bundled magnus-helper writes it on the user's Mac, even from a Cowork sandbox.

```
magnus_save_asset({
  filename: "<sanitised-kebab-case>.<ext>",
  contentBase64: "<base64 string, no data: prefix>",
  category: "<team|logos|reports|images|icons|og>",
  replace: false
})
```

The tool validates the filename format, the category, the extension against the category's allowed list, and the size against per-category caps. Returned errors are typed and self-explanatory — `INVALID_FILENAME`, `TYPE_MISMATCH`, `TOO_LARGE`, `ALREADY_EXISTS`, `INVALID_BASE64`, `INVALID_CATEGORY`, `WRITE_FAILED`, plus the standard `REPO_NOT_FOUND` / `AMBIGUOUS_REPO` if the helper can't find the magnus repo.

On success the tool returns `{ saved, path, publicPath, bytes, replaced }`. Use `publicPath` (e.g. `/team/teresa-allan.jpg`) when you wire the asset into a referencing data file in Step 6.

If `magnus_save_asset` errors with "tool not available" (the magnus-helper MCP isn't wired into this session for some reason), fall back to 4b.

### 4b · Absolute path on disk

The user pastes an absolute path (e.g. `/Users/leedavies/Downloads/teresa-headshot.jpg`). Works in Claude Code or solo Claude Desktop where Bash sees the user's filesystem.

- Confirm the path exists: `test -f <path> && echo OK || echo MISSING`. Stop on MISSING.
- Use `cp <source> public/<dir>/<filename>` to copy. **Never `mv`** — leave the source intact in case the user wants to keep it.

### 4c · "It's already in `public/`"

The user has manually dropped the file in. Verify with `test -f public/<dir>/<filename>`. If present, skip Step 5 and continue from Step 6 (referencing data).

### 4d · URL download

The user provides a URL (e.g. a CDN link, a Google Drive link). Refuse this without explicit user authorisation in the same message — downloading from URLs is a privileged action and should be confirmed every time. If approved, use `curl -L -o public/<dir>/<filename> <url>` and verify the result.

## Step 5 — Validate the file

Before copying or finalising:

- **File type.** Confirm the actual file matches the expected types for the category (use `file <path>` to check magic bytes — extensions can lie). Refuse mismatches.
- **Size.**
  - Images: warn if > 2MB (`du -h <path>`). Suggest the user compress before uploading. Don't compress the file yourself — that's a creative decision.
  - PDFs: warn if > 10MB. Same handling.
  - SVGs: refuse anything > 200KB (typically indicates an inlined raster).
- **Filename.** Sanitise to kebab-case. Default: derive from the user's description, e.g. "Teresa headshot" → `teresa-headshot.jpg`. Confirm the default with the user before using.
- **Collision.** If `public/<dir>/<filename>` already exists and the operation is **upload** (not replace), ask: "A file with that name already exists. Replace it (yes) or pick a different name?"

## Step 6 — Wire the new path into referencing data (if applicable)

Some asset categories have a data file that references them. If the user added a team photo, offer to update the corresponding entry in `src/data/team.ts`:

```
Want me to wire `/team/teresa-allan.jpg` into Teresa's entry in src/data/team.ts so it shows up on her bio page?
```

If yes, use `Edit` on `src/data/team.ts` to add `image: '/team/<filename>',` to the matching member object (search by `slug` or `name`). Match the file's existing formatting — same indentation, single quotes (or double if the value contains `'`), trailing comma.

For other categories, ask whether the user wants a referencing change (e.g. "add this logo to the homepage carousel") or whether they'll handle that separately via **magnus-edit-page**. Don't proactively edit pages without confirmation.

## Step 7 — Approval gate (replace operations only)

**Upload of a new asset** — no gate. The asset is new content the user is bringing in.

**Replace** of:

- A team headshot whose subject has approved the new image
- A client logo
- An OG / social card

→ no gate beyond user confirmation.

**Replace** of:

- A report PDF (`public/reports/`) — gated. Reports are firm-published artefacts.
- An asset referenced from a growth story page (search `src/content/growth-stories/` for the filename)
- The favicon

→ require an `approved by <name>` line in chat. Append to `.magnus-changes/pending.log`:

```
<ISO timestamp> | public/<dir>/<filename> | Replace asset (was <SHA-or-mtime>, now <new ref>) | approved by <name>
```

**Remove** — always gated, regardless of category. Files removed from production can't be recovered without git restore. Require approval line.

## Step 8 — Apply the operation

- **Upload / replace**: `cp <source> public/<dir>/<filename>` (or `Write` for SVG text). Verify with `test -f public/<dir>/<filename>` and `du -h` for sanity.
- **Remove**: `git rm public/<dir>/<filename>` (uses git so the deletion is staged for the next commit; the file stays in git history).
- **Referencing data update** (Step 6 yes): apply the `Edit` to the data file.

Tell the user what files were created, modified, or removed.

## Step 9 — Smoke check

- For images and PDFs added: confirm the file exists at the expected path with the expected size.
- For data file updates: re-read the modified file and confirm the new `image:` field is present and points to the right path.
- Optionally: run `npx astro check 2>&1 | tail -10` if a data file was modified — only if the user wants type validation.

## Step 10 — Surface in preview if applicable

If the asset is referenced from a page (team photo wired into team.ts, logo on homepage, etc.), navigate the live preview to that page so the user can see it:

1. Try `preview_list()` → if magnus-dev running, `preview_eval` to navigate to the affected route.
2. Else try `magnus_dev_status` → if running, `magnus_open_url`.
3. Else ask: "Want to spin up a preview to check the asset is showing correctly?"

For assets that aren't referenced from a page (e.g. a standalone PDF in `public/reports/`), just point the user at the public URL: `http://localhost:4321/<dir>/<filename>` once the dev server is running.

## Step 11 — Hand off

End with one line summarising what was done and the suggested next step:

- Wired into a data file: "`<filename>` saved to `public/<dir>/<filename>` and wired into `<data file>`. Now showing on `<route>` in the preview. Ready to ship? Run **magnus-publish**."
- Asset only: "`<filename>` saved to `public/<dir>/<filename>`. Reference it from a page via **magnus-edit-page** or run **magnus-publish** to commit the asset alone."

## Refusal templates

> That file type (`<ext>`) isn't allowed for `<category>`. Allowed types: `<list>`. Convert it first or drop it in a different category.

> The image is `<size>`. That's larger than the recommended ceiling for `<category>`. Compress it (Squoosh or similar) and re-upload — large unoptimised assets slow the site for everyone.

> A file already exists at `public/<dir>/<filename>`. To overwrite it, say "replace" instead of "upload", or pick a different filename.

> URL downloads need explicit one-time authorisation. Confirm in chat that you want me to fetch `<url>` to `public/<dir>/<filename>`.

> Removing a file from production is a gated operation. Paste `approved by <name>` in chat to proceed.
