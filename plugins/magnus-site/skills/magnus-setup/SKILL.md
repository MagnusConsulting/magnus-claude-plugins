---
name: magnus-setup
description: Bootstrap the Magnus Consulting website repo in the current working folder so the magnus-site skills can run. Use when the user says "set up magnus", "clone the magnus repo", "init magnus here", "I'm new to this", or is directed here by another magnus skill that detected the working directory isn't the magnus repo. Detects whether the current folder is already the magnus repo; if not, offers to clone https://github.com/ssu96ld/magnusconsulting-co-uk into the current folder, or accepts a path to an existing clone. Runs `npm install` after cloning. Then tells the user to open a new Claude session with the repo folder as the working directory so the rest of the magnus skills resolve paths correctly.
---

# Magnus — Setup

You are bootstrapping the Magnus Consulting website repo so the rest of the `magnus-site` plugin skills (`magnus-edit-page`, `magnus-add-insight-article`, `magnus-preview`, …) can run. Those skills assume the working directory contains:

- `package.json` with `astro` in dependencies and a `dev` script
- `src/pages/`
- `docs/llm-context.md`

Your job is to make sure that's true.

The canonical repo is **`https://github.com/ssu96ld/magnusconsulting-co-uk.git`**.

## Step 1 — Check the current working directory

Run `pwd` and check for the three markers above. Use Read or Bash `test -f` for the files, `test -d` for the directory.

If all three are present:

> You're already in the magnus repo at `<absolute-path>`. No setup needed — go ahead and use any of the magnus-site skills (`magnus-edit-page`, `magnus-add-insight-article`, `magnus-preview`).

Stop here.

## Step 2 — If a `.git` is present, check the remote

If the current folder is a git repo (`test -d .git`) but missing one of the three markers, run `git remote get-url origin`.

- Remote matches `https://github.com/ssu96ld/magnusconsulting-co-uk` (with or without `.git` suffix) → the repo is partially cloned or has unexpected state. Tell the user, list which markers are missing, and ask whether to `git pull` or whether something has been deliberately removed.
- Remote points to a different repo → this folder is a different project. Tell the user and skip to Step 3.
- No remote configured → also skip to Step 3.

## Step 3 — Offer paths forward

Ask the user, one short question:

> The current folder isn't the magnus repo. Want me to:
> 1. **Clone it here** — runs `git clone https://github.com/ssu96ld/magnusconsulting-co-uk.git` into this folder, creating a subdirectory.
> 2. **Use an existing clone** — paste the absolute path to where you already have it cloned.
> 3. **Cancel** — exit so you can `cd` somewhere yourself.

Wait for the user's choice.

## Step 4a — Clone here

If they pick 1:

1. Confirm the target subdirectory name. Default: `magnusconsulting-co-uk` (the repo name). Allow override (e.g. `magnus`).
2. Verify the target subdirectory does not already exist. If it does, ask whether to use it (Step 4b) or pick a different name.
3. Run via Bash:
   ```bash
   git clone https://github.com/ssu96ld/magnusconsulting-co-uk.git <subdir>
   ```
   Confirm exit status 0.
4. Verify `docs/llm-context.md` exists inside the cloned folder. If not, the repo state is unexpected — report and stop.
5. Check Node.js version. The repo's `package.json` requires `node >=22.12.0`. Run `node --version`. If lower, warn the user and ask whether to continue (npm install may fail).
6. Run `npm install` from inside the cloned folder. This can take 30s–2min. Use Bash; capture exit status.
   ```bash
   (cd <subdir> && npm install)
   ```
7. On success, hand off as in Step 5.

## Step 4b — Use an existing clone

If they pick 2:

1. Take the path they paste. Verify it's absolute and the directory exists.
2. Verify the three markers are present at that path.
3. If the markers are present but `node_modules/` is absent, offer to run `npm install` for them at that path.
4. Hand off as in Step 5.

## Step 4c — Cancel

If they pick 3, exit cleanly:

> Okay — `cd` to the magnus repo (or a folder where you want to clone it) and re-run `magnus-setup`.

Stop.

## Step 5 — Hand off

The other magnus-site skills resolve relative paths (`docs/llm-context.md`, `src/pages/...`) against the Claude session's working directory, which is fixed at session start. Changing directory inside Bash within this session **does not** update the session's working directory for tools like Read and Edit.

Tell the user:

> Magnus repo is ready at `<absolute-path>`. To use the magnus-site skills (edit-page, add-insight-article, preview), open a new Claude session with this folder as the working directory:
>
> - **Claude Code CLI:** run `cd <absolute-path>` then `claude` in your terminal.
> - **Claude Desktop / Cowork:** start a new session and select `<absolute-path>` as the project folder.
>
> Then trigger any magnus-site skill — they'll work straight away.

That's the whole skill. Don't try to invoke another skill from this one — the working directory change won't propagate.

## Refusal templates

> The clone target subdirectory `<name>` already exists and isn't a magnus repo. Pick a different name, or remove/move the existing folder yourself first.

> The path you gave (`<path>`) doesn't exist or isn't readable. Double-check and paste again.

> The path `<path>` exists but isn't a magnus repo (missing `docs/llm-context.md` and `src/pages/`). Either it's the wrong path or the clone is partial — tell me which.
