---
name: magnus-preview
description: Start, navigate, or stop a live preview of the Magnus Consulting Astro site. Use when the user says "preview", "show me the site", "open /<route>", "start the dev server", "spin up a preview", "preview the change", or "stop the preview". Tries the Claude Desktop preview pane first (`Claude_Preview` MCP); if that's not available in the current context (e.g. Cowork), falls back to starting `npm run dev` in the background and opening the URL in the system default browser. Other Magnus skills (magnus-edit-page, magnus-add-insight-article) call this hook automatically after applying changes so the admin sees results in real time. Astro HMR refreshes subsequent edits in place — no restart needed.
---

# Magnus — Preview

You manage a live preview of the Magnus Consulting site. Two mechanisms, picked automatically by what the current session supports:

- **Path A — `Claude_Preview` MCP** (Claude Desktop solo, Claude Code with the MCP wired). Shows the site in the right-hand preview pane.
- **Path B — System browser fallback** (Cowork or any context where `Claude_Preview` isn't wired). Starts `npm run dev` in the background and opens the URL in the user's default browser.

The cascade is automatic. Don't ask the user which path to take — pick whichever is available.

## Step 1 — Confirm working directory is the magnus repo

Verify all three are present:

- `package.json` with `astro` in dependencies and a `dev` script (currently `astro dev`)
- `src/pages/` directory
- `docs/llm-context.md`

If any are missing, stop and tell the user. The preview must run from the magnus repo root.

## Step 2 — Detect which path is available

Call `preview_list()`.

- **Returns successfully** (even if empty) → `Claude_Preview` MCP is wired. Use **Path A**.
- **Errors with "tool not available", schema unknown, or similar** → Use **Path B**.

Don't retry on a tool-availability error; just fall through.

## Path A — Claude_Preview pane

### A1 — Ensure `.claude/launch.json` has a `magnus-dev` config

The `Claude_Preview` MCP reads server configurations from `<repo>/.claude/launch.json`. If the file doesn't exist, create it with exactly this content:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "magnus-dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 4321
    }
  ]
}
```

If the file exists but has no `magnus-dev` entry, add it without removing other entries. If `astro.config.mjs` sets a non-default `server.port`, update the `port` field to match.

This file should be committed to the magnus repo (don't gitignore it).

### A2 — Start or reuse the server

If `preview_list()` already showed a `magnus-dev` server, capture its `serverId` and skip to A3.

Otherwise call `preview_start({ name: "magnus-dev" })`. The tool blocks until the server is ready. Capture the returned `serverId`.

If startup fails:

- Port collision (`EADDRINUSE`) → tell the user port 4321 is in use; offer `lsof -i :4321` to identify the holder. Don't kill anything yourself.
- Missing dependency → suggest `npm install` from the magnus repo root.
- Other error → report verbatim and stop.

### A3 — Navigate to the target route (if specified)

If the user asked for a specific page or this skill was called by another skill with a target route:

```
preview_eval({
  serverId,
  expression: "window.location.assign('<ROUTE>')"
})
```

`<ROUTE>` is a path beginning with `/` (e.g. `/insights/gtm-confidence-loop`). Don't pass full URLs.

## Path B — System browser fallback

### B1 — Check if `npm run dev` is already running on port 4321

Run `lsof -ti:4321` via Bash. Capture exit status / output:

- **Returns one or more PIDs** → server already up. Skip to B3.
- **Returns nothing** → no server running. Continue to B2.

### B2 — Start `npm run dev` in the background

Run `npm run dev` from the magnus repo root using Bash with `run_in_background: true`. Capture the shell ID (you don't need it later — stop is handled by port).

Then poll for readiness — wait until the server responds before opening the browser:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:4321 | grep -q "^[23]"; do sleep 1; done
```

Cap this at ~30 seconds; if it doesn't come up, read the background shell's output (`BashOutput`), report any error, and stop. Don't open a browser to a dead server.

### B3 — Open the URL in the default browser

Build the full URL: `http://localhost:4321<route>` (default `/` if no route specified).

On macOS (which is the working environment per env reports):

```bash
open "http://localhost:4321<route>"
```

If on Linux, use `xdg-open` instead. On Windows, `start`. Detect from `uname` if you're unsure.

The browser opens in a separate window — that's expected. Don't try to embed it.

## Step 3 — Confirm to the user

Reply with one short line tailored to the path taken:

- Path A: "Preview is live at `http://localhost:4321<route>` — showing in the right-hand pane. Subsequent edits will hot-reload automatically."
- Path B: "Preview is live at `http://localhost:4321<route>` — opened in your default browser. Subsequent edits will hot-reload automatically (refresh the tab if needed)."

Don't take a screenshot unless the user asks.

## Stopping the preview

If the user says "stop the preview", "kill the dev server", "shut it down", or similar:

1. Try `preview_list()`.
2. **If it succeeds and a `magnus-dev` server is listed** → `preview_stop({ serverId })`. Confirm.
3. **Otherwise** (Path B was used, or no server running):
   - `lsof -ti:4321` to find the PID(s).
   - If any → `lsof -ti:4321 | xargs kill` (TERM, not -9). Confirm.
   - If none → tell the user no preview server is currently running. Don't error.

## Calling pattern from other skills

Other Magnus skills call this skill in two ways:

- **After applying a change** — they pass the target route and expect a navigate-only or start-then-navigate flow.
- **As a standalone request** — the user explicitly asks to preview.

Both flows go through Steps 1–3 in the same order. The cascade is internal — calling skills don't need to know which path was used.

The skill is idempotent: calling it when the server is already running just navigates (Path A) or opens a fresh browser tab on the URL (Path B).
