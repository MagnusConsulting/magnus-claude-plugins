---
name: magnus-update-nav
description: Update the Magnus Consulting site navigation (Nav.astro) or footer (Footer.astro) — add, remove, rename, reorder menu items, change submenu structure, update link targets, and rewire activeLink references on existing pages. Use when the user says "add to the menu", "change the nav", "rename a menu item", "update the footer", "remove the search link", or "add a careers link". Reads every `<Nav activeLink="..." />` reference across `src/pages/` to keep wiring consistent. NOT for general edits to a page (use magnus-edit-page) or for adding new pages (use magnus-add-page or the magnus-add-* creation skills).
---

# Magnus — Update navigation and footer

You are editing the Nav, the Footer, or both. This is a structural change — it affects every page that uses the nav (every page on the site). Treat it carefully.

## Step 1 — Load the contract and confirm location

Read `docs/llm-context.md`, focusing on §3.5 Nav and Footer. If `docs/llm-context.md` is missing, the working directory isn't the magnus repo. Offer to run **magnus-setup** or stop.

## Step 2 — Determine the operation and component

Confirm with the user which component is being edited and what kind of change. The matrix:

| Component | Operation | Examples |
|---|---|---|
| `Nav.astro` | Add menu item | Add "Careers" between "Team" and "Insights" |
| `Nav.astro` | Remove menu item | Remove the "Search" icon button |
| `Nav.astro` | Rename | Rename "Growth Challenges" to "Challenges" |
| `Nav.astro` | Reorder | Move "Insights" before "Team" |
| `Nav.astro` | Change link target | Point "Let's talk" at a Calendly URL instead of `/contact` |
| `Nav.astro` | Edit submenu under Solutions | Add a new entry under the Solutions dropdown |
| `Footer.astro` | Same operations | Footer has its own link groups |

If the user is unclear, ask. A nav change usually has implications for the footer too (e.g. add a top-level menu item → also add the corresponding footer link). Confirm scope.

## Step 3 — Read the affected files

Read both `src/components/Nav.astro` and `src/components/Footer.astro` in full, regardless of which the user named. Footer often mirrors nav structure for completeness.

If the operation involves an `activeLink` value (adding/renaming a top-level item), also enumerate every page that calls `<Nav activeLink="..." />`:

```bash
grep -rn 'Nav activeLink' src/pages/ | head -50
```

Capture the file paths and the activeLink value used in each.

## Step 4 — Plan the change

For each operation, the plan needs to cover:

### Adding a menu item

1. Pick an `activeLink` value (kebab-case, matches the convention: `home`, `solutions`, `challenges`, `impact`, `insights`, `team`, `about`, `contact`, plus any new one).
2. Pick the link target (must be an existing route or a route the user is about to create — confirm).
3. Pick the position in the menu order.
4. Decide whether the footer should mirror the addition (usually yes for top-level items).
5. Decide whether the new section's page should set `<Nav activeLink="<new-value>" />` once it exists.

### Removing a menu item

1. Confirm the link target is genuinely going away — not just hidden temporarily.
2. Find every page currently using that `activeLink` value (Step 3 grep) and decide what to set them to instead (often `''` or another related value).
3. Decide whether the footer link should be removed too.

### Renaming a menu item

1. Confirm the URL stays the same (purely a label change).
2. If the URL changes too, this overlaps with **magnus-edit-page** for every page that links to the old URL — get the list before proceeding.
3. Decide whether the `activeLink` value should also change. Usually keep it for stability; only change if the new label has a meaningfully different identifier and you're prepared to update every page reference.

### Reordering

1. Just an order change. Confirm the new order and apply.

### Changing a link target

1. Confirm the new target — internal route or external URL.
2. External URLs warrant `target="_blank" rel="noopener"`; internal routes don't.

### Editing the Solutions submenu

1. The Solutions submenu lives inside `Nav.astro`'s `<ul class="nav-links">` under the Solutions item. Editing it is a localised change in Nav.astro only.
2. New submenu items must point at existing solution pages or pages being created via **magnus-add-solution-page** (developer only) — never dead links.

## Step 5 — Approval gate

Nav and footer changes are **always gated**. The nav appears on every page; an unintended change is high-blast-radius.

Ask the user:

> Nav and footer changes appear on every page on the site. Paste **`approved by <name>`** in chat — `<name>` is the partner or designated reviewer who has approved this change.

Wait for an exact match. On success, append to `.magnus-changes/pending.log` (create directory and `.gitignore` entry if missing):

```
<ISO> | src/components/Nav.astro | <operation summary> | approved by <name>
```

Plus one line per page whose `activeLink` is being rewired:

```
<ISO> | src/pages/<path> | Update Nav activeLink: <old> → <new> | approved by <name>
```

## Step 6 — Compose the changes

For each file, plan the exact `Edit` operations. Be precise about anchors — Nav.astro is only 58 lines, so anchor on the surrounding link or comment.

Examples:

**Adding a menu item between Team and Insights:**

Find:
```astro
                <li>
                    <a href="/team" class={activeLink === 'team' ? 'active' : ''}>Team</a>
                </li>
                <li>
                    <a href="/insights" class={activeLink === 'insights' ? 'active' : ''}>Insights</a>
                </li>
```

Replace with:
```astro
                <li>
                    <a href="/team" class={activeLink === 'team' ? 'active' : ''}>Team</a>
                </li>
                <li>
                    <a href="/careers" class={activeLink === 'careers' ? 'active' : ''}>Careers</a>
                </li>
                <li>
                    <a href="/insights" class={activeLink === 'insights' ? 'active' : ''}>Insights</a>
                </li>
```

**Renaming a menu item:**

Use the Edit tool with the literal label as the anchor — the label is unique within Nav.astro, so the change is unambiguous.

**Rewiring activeLink across pages:**

For each page identified in Step 3, run an `Edit` on `<Nav activeLink="<old>" />` → `<Nav activeLink="<new>" />`. Each page is one Edit. The user can review each one in the tool log.

## Step 7 — Show preview, then confirm

Output:

1. **Operation summary** — what's changing on which file(s).
2. **The exact diffs** — before/after blocks for each edit, including any per-page `activeLink` rewires.
3. **Audit log entries** to be appended.
4. One sentence asking for go-ahead.

Wait for explicit yes. Do not edit before that.

## Step 8 — Apply the edits

Use the `Edit` tool for each change. Order:

1. `src/components/Nav.astro` (the structural change).
2. `src/components/Footer.astro` if mirrored.
3. Any per-page `activeLink` rewires under `src/pages/`.
4. Append the audit log entries.

One Edit per change so the tool log is reviewable.

## Step 9 — Smoke check

- Re-read Nav.astro and Footer.astro. Confirm the change landed and there are no orphan `<li>` or unclosed tags.
- Re-read each page whose `activeLink` was rewired and confirm the new value is in place.
- Run `npx astro check 2>&1 | tail -10`. Refuse to declare done on new errors.

## Step 10 — Surface in live preview

Nav changes are visible on every page — no specific route to navigate to. Just open or reload the current preview:

1. Try `preview_list()`. If success and `magnus-dev` is running — call `preview_eval({ serverId, expression: "window.location.reload()" })`. The user sees the change on whatever page they're already on.
2. Else try `magnus_dev_status`. If running — `magnus_open_url('http://localhost:4321/')` to open the homepage with the new nav.
3. Else ask once whether to start a preview.

Suggest the user click into a few pages to confirm the `activeLink` highlighting looks correct after rewires.

## Step 11 — Hand off

End with one line:

- "Nav updated. `<N>` page references rewired. Approval recorded for `<name>`. Reload the preview to see the change on every page. Ready to ship? Run **magnus-publish**."

Note specifically: nav changes touch a high number of pages via the activeLink rewires. The PR diff will be larger than a typical change — that's expected and correct.

## Refusal templates

> Removing the "Solutions" menu item would orphan four pages (`/solutions`, `/solutions/where-to-play`, etc.). This isn't an admin change — it's a structural redesign. Bring the build team in.

> The new menu target `/careers` doesn't exist as a route yet. Either create it first via **magnus-add-page**, or confirm you want a placeholder link that 404s until the page lands (not recommended).

> Changing the activeLink value `solutions` → `services` would rewire the value across 8 pages. Confirm explicitly that you want all those pages updated, or pick a less invasive change (label rename only, not value rename).

> Submenu items pointing at non-existent solution pages create dead links in production. Either point at an existing page or create the page first.
