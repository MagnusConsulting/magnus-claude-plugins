---
name: magnus-preview
description: Start, navigate, or stop the local Magnus Consulting Astro dev server inside the Claude Desktop preview pane (right-hand side). Use when the user says "preview", "show me the site", "open /<route>", "start the dev server", "spin up a preview", "preview the change", or "stop the preview". Spins up `npm run dev` (creating .claude/launch.json on first use), shows the live site, and optionally navigates to a specific route. Other Magnus skills (magnus-edit-page, magnus-add-insight-article) call this hook automatically after applying changes so the admin sees results in real time. Astro HMR refreshes subsequent edits in place — no restart needed.
---

# Magnus — Preview

You manage the local Astro dev server lifecycle for the Magnus Consulting site inside the Claude Desktop preview pane.

## Step 1 — Confirm working directory is the magnus repo

Verify all three are present:

- `package.json` with `astro` in dependencies and a `dev` script (currently `astro dev`)
- `src/pages/` directory
- `docs/llm-context.md`

If any are missing, stop and tell the user. The preview must run from the magnus repo root.

## Step 2 — Ensure `.claude/launch.json` has a `magnus-dev` config

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

If the file exists but has no `magnus-dev` entry, add it without removing other entries. If `astro.config.mjs` sets a non-default `server.port`, update the `port` field to match — the preview tool needs the right port to find the server.

This file should be committed to the magnus repo (don't gitignore it) — other developers benefit from it.

## Step 3 — Start or reuse the server

Call `preview_list()`. If a server named `magnus-dev` is in the list, capture its `serverId` and skip to Step 4.

Otherwise call:

```
preview_start({ name: "magnus-dev" })
```

The tool blocks until the server is ready. Capture the returned `serverId`.

If startup fails:

- "EADDRINUSE" or port collision → tell the user port 4321 is in use; offer to identify the holder with `lsof -i :4321` and let them decide whether to kill it. Don't kill anything yourself.
- Missing dependency → suggest `npm install` from the magnus repo root.
- Any other error → report verbatim and stop.

## Step 4 — Navigate to the target route (if specified)

If the user asked for a specific page (e.g. "preview /about", "show me the new article"), or another skill called this one with a target route, navigate the preview:

```
preview_eval({
  serverId,
  expression: "window.location.assign('<ROUTE>')"
})
```

`<ROUTE>` is a path beginning with `/` (e.g. `/insights/gtm-confidence-loop`). Do not pass full URLs.

If no target was given, leave the preview on whatever URL the server landed on (typically `/`).

## Step 5 — Confirm to the user

Reply with one short line, e.g.:

> Preview is live at `http://localhost:4321<route>` — showing in the right-hand pane. Subsequent edits will hot-reload automatically.

Don't take a screenshot unless the user asks — the pane is already visible.

## Stopping the preview

If the user says "stop the preview", "kill the dev server", "shut it down", or similar:

1. `preview_list()` → find the `magnus-dev` entry's `serverId`.
2. `preview_stop({ serverId })`.
3. Confirm with one line.

If no `magnus-dev` server is running, say so — don't error.

## Graceful degradation

If the `preview_*` tools error with "tool not available" or similar (the user is in a Claude Code terminal context without the Desktop preview pane), tell the user:

> The preview pane isn't available in this context. You can run `npm run dev` from the magnus repo manually and open `http://localhost:4321` in a browser.

Stop. Don't keep retrying.

## Calling pattern from other skills

Other Magnus skills (`magnus-edit-page`, `magnus-add-insight-article`, future create skills) call this skill in two ways:

- **After applying a change** — they pass the target route and expect a navigate-only or start-then-navigate flow.
- **As a standalone request** — the user explicitly asks to preview.

Both flows go through Steps 1–5 in the same order. The skill is idempotent: calling it when the server is already running just navigates.
