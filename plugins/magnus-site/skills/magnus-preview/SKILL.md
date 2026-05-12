---
name: magnus-preview
description: Start, navigate, or stop a live preview of the Magnus Consulting Astro site. Use when the user says "preview", "show me the site", "open /<route>", "start the dev server", "spin up a preview", "preview the change", or "stop the preview". Picks the right preview mechanism for the current context — Claude Desktop preview pane, the bundled magnus-helper local MCP (Cowork), or the system default browser — and falls through gracefully. Other Magnus skills (magnus-edit-page, magnus-add-insight-article) call this hook after applying changes so the admin sees results in real time. Astro HMR refreshes subsequent edits in place — no restart needed.
---

# Magnus — Preview

You manage a live preview of the Magnus Consulting site. Three mechanisms, picked automatically by what the current session supports:

- **Path A — `Claude_Preview` MCP** (Claude Desktop solo, Claude Code with the MCP wired). Shows the running site in the right-hand preview pane.
- **Path B — `magnus-helper` MCP** (Claude Cowork — the helper bundled with this plugin runs on the user's Mac and bridges through). Starts the dev server on the user's machine and opens the URL in their default browser.
- **Path C — Bash fallback** (Claude Code on the user's machine when neither MCP is available). Starts `npm run dev` in the background and opens the URL via `open`.

The cascade is automatic. Don't ask the user which path to take — pick whichever is available.

## Step 1 — Try `Claude_Preview` MCP first

Call `preview_list()`.

- **Returns successfully** (even if empty) → use **Path A**.
- **Errors with "tool not available", schema unknown, or similar** → continue to Step 2.

## Step 2 — Try `magnus-helper` MCP

Call `magnus_dev_status`.

- **Returns successfully** (a JSON blob with `running`, `port`, etc.) → use **Path B**.
- **Errors with "tool not available"** → continue to Step 3.

## Step 3 — Verify working directory and use Bash fallback

Verify the working directory is the magnus repo:

- `package.json` with `astro` in dependencies and a `dev` script
- `src/pages/` directory
- `docs/llm-context.md`

If all three present → use **Path C**.

If any are missing, the working directory isn't the magnus repo. Don't try to start a server. Tell the user:

> This folder isn't the magnus repo (preview needs `package.json`, `src/pages/`, `docs/llm-context.md`). The toolkit needs `~/Projects/Claude/magnus-website` as the project folder. Want me to:
> 1. Run **magnus-setup** for the install / re-open instructions, or
> 2. Exit so you can re-open this Claude project pointed at `~/Projects/Claude/magnus-website` and try again?

Wait for direction. If they pick 1, invoke **magnus-setup**. If they pick 2, stop.

## Path A — Claude_Preview pane

### A1 — Ensure `.claude/launch.json` has a `magnus-dev` config

The `Claude_Preview` MCP reads server configurations from `<repo>/.claude/launch.json`. If the file doesn't exist, create it:

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

This file should be committed to the magnus repo.

### A2 — Start or reuse the server

If `preview_list()` already showed a `magnus-dev` server, capture its `serverId` and skip to A3.

Otherwise call `preview_start({ name: "magnus-dev" })`. The tool blocks until the server is ready. Capture the returned `serverId`.

If startup fails:
- Port collision → tell user to run `lsof -i :4321` and decide what to do.
- Missing dependency → suggest `npm install` from the magnus repo root.
- Other error → report verbatim and stop.

### A3 — Navigate to the target route

If the user asked for a specific page or this skill was called with a target route:

```
preview_eval({
  serverId,
  expression: "window.location.assign('<ROUTE>')"
})
```

`<ROUTE>` is a path beginning with `/`. Don't pass full URLs.

## Path B — magnus-helper MCP

The `magnus-helper` MCP runs on the user's Mac (bundled with this plugin) and exposes tools to start the dev server, check its status, and open URLs in the user's default browser. This path is the right one in Cowork, where Claude runs in a remote sandbox but local MCPs bridge through.

### B1 — Check status

Call `magnus_dev_status`. If `running: true`, skip to B3 (just navigate the existing server).

### B2 — Start the server

Call `magnus_dev_start`. Possible responses:

- `{ alreadyRunning: true }` → proceed to B3.
- `{ started: true, port: 4321, pid, repoPath }` → proceed to B3.
- `{ error: "AMBIGUOUS_REPO", candidates: [...] }` → multiple magnus repos found on the Mac. Ask the user:
  > I found multiple magnus repos on your Mac. Which one should I use?
  > 1. `<candidate 1>`
  > 2. `<candidate 2>`
  > …
  
  Once they pick, call `magnus_set_repo_path` with the chosen path, then retry `magnus_dev_start`.
- `{ error: "REPO_NOT_FOUND" }` → no magnus repo found in the usual locations. Ask:
  > I couldn't find the magnus repo on your Mac. Paste the absolute path to it.
  
  Validate they pasted an absolute path, call `magnus_set_repo_path`, then retry `magnus_dev_start`.
- `{ error: "STARTUP_TIMEOUT", repoPath }` → the dev server didn't come up. Likely cause is missing `node_modules`. Tell the user:
  > The dev server didn't respond on port 4321 within 30 seconds. From a terminal in `<repoPath>`, run `npm install` and try again.
  
  Don't run `npm install` yourself — that's the user's machine; let them do it.
- `{ error: "NOT_MAGNUS_REPO" }` (from `magnus_set_repo_path`) → tell the user the path they gave doesn't look like a magnus repo and ask again.

### B3 — Open the URL

Build the full URL: `http://localhost:4321<route>` (default `/` if no route).

Call:

```
magnus_open_url({ url: "http://localhost:4321<route>" })
```

This opens the URL in the user's default browser via the OS `open` command. The browser appears in a separate window — that's expected.

## Path C — Bash fallback (local Claude Code only)

### C1 — Check if `npm run dev` is already running on port 4321

Run `lsof -ti:4321` via Bash.

- Returns one or more PIDs → server already up. Skip to C3.
- Returns nothing → continue to C2.

### C2 — Start `npm run dev` in the background

Run `npm run dev` from the magnus repo root using Bash with `run_in_background: true`. Capture the shell ID.

Poll for readiness:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:4321 | grep -q "^[23]"; do sleep 1; done
```

Cap at ~30 seconds. If it doesn't come up, read the background shell's output, report any error, and stop.

### C3 — Open the URL

Build the full URL: `http://localhost:4321<route>` (default `/` if no route).

```bash
open "http://localhost:4321<route>"
```

(Use `xdg-open` on Linux, `start` on Windows.)

## Step 4 — Confirm to the user

Reply with one short line tailored to the path:

- Path A: "Preview is live at `http://localhost:4321<route>` — showing in the right-hand pane. Subsequent edits will hot-reload automatically."
- Path B: "Preview is live at `http://localhost:4321<route>` — opened in your default browser via the magnus-helper. Subsequent edits will hot-reload automatically (refresh the tab if needed)."
- Path C: "Preview is live at `http://localhost:4321<route>` — opened in your default browser. Subsequent edits will hot-reload automatically."

Don't take a screenshot unless the user asks.

## Stopping the preview

If the user says "stop the preview", "kill the dev server", "shut it down":

1. Try `preview_list()`. If success and `magnus-dev` server is listed → `preview_stop({ serverId })`. Confirm.
2. Else try `magnus_dev_stop`. If success → confirm with the response message.
3. Else try Bash: `lsof -ti:4321 | xargs kill 2>/dev/null`. Confirm.
4. If nothing was running, say so — don't error.

## Calling pattern from other skills

Other Magnus skills call this skill in two ways:

- **After applying a change** — they pass the target route and expect navigate-only or start-then-navigate.
- **As a standalone request** — the user explicitly asks to preview.

Both flows go through Steps 1–4 in the same order. The cascade is internal — calling skills don't need to know which path was used.

The skill is idempotent: calling it when the server is already running just navigates (Path A) or opens a fresh tab (Paths B/C).
