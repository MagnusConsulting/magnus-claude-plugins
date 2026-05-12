---
name: magnus-setup
description: Verify that the current Claude session is running with the Magnus Consulting website repo as its working directory, and — if it isn't — give the user the one-paste Terminal command to install everything cleanly. Use when the user says "set up magnus", "I'm new to this", "is this working?", or is directed here by another magnus skill that detected the working directory isn't the magnus repo. Does NOT clone or install anything from inside the Claude session — installation is one paste in Terminal, then the user opens the cloned folder as a Claude project.
---

# Magnus — Setup

You verify that the Claude session is pointed at the Magnus Consulting website repo. If it isn't, you hand the user a single Terminal command that installs everything and tells them how to open the result as a Claude project. You do **not** clone, install, or change directories from inside this session — the install lives in Terminal so that the first working Claude session opens straight onto the populated repo.

The canonical install path is **`~/Projects/Claude/magnus-website`**. Every machine should use this path so support, docs, and the helper MCP can all rely on it.

## Step 1 — Check the current working directory

Run `pwd` and check for the three markers a magnus repo must contain:

- `package.json` with `astro` in dependencies and a `dev` script
- `src/pages/`
- `docs/llm-context.md`

Use Read for the files, Bash `test -d` for the directory.

If all three are present:

> You're in the magnus repo at `<absolute-path>`. Everything is ready — go ahead and use any of the magnus-site skills (`magnus-edit-page`, `magnus-add-insight-article`, `magnus-preview`, …).

Stop here.

## Step 2 — If something is partial

If the current folder is a git repo (`test -d .git`) and `git remote get-url origin` matches `https://github.com/ssu96ld/magnusconsulting-co-uk` (with or without `.git`), but one of the three markers is missing, the clone is incomplete. Tell the user which markers are missing, suggest `git pull`, and stop.

For anything else, continue to Step 3.

## Step 3 — Print the install instructions

The current session isn't pointed at the magnus repo. Don't try to fix that from here — Claude's working directory is fixed at session start. Instead, give the user the canonical setup paste-and-go, then tell them how to reopen the project. Respond with this template, verbatim apart from filling in the user's name if you know it:

> This Claude session isn't pointed at the magnus repo. The toolkit needs `~/Projects/Claude/magnus-website` as the project folder.
>
> **If you've already installed it:** close this session and open the `magnus-website` project (or, in Claude Code, run `cd ~/Projects/Claude/magnus-website && claude`). Then re-run whatever you were doing.
>
> **If you haven't installed it yet:** open Terminal (⌘ + Space, type `Terminal`, Return) and paste this whole block in one go:
>
> ```bash
> /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
>   && eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)" \
>   && brew install gh node \
>   && gh auth login \
>   && mkdir -p ~/Projects/Claude \
>   && gh repo clone ssu96ld/magnusconsulting-co-uk ~/Projects/Claude/magnus-website \
>   && (cd ~/Projects/Claude/magnus-website && npm install)
> ```
>
> The paste does five things in one go: installs Homebrew + `gh` + Node, logs you into GitHub (pause to authorise in your browser when prompted), clones the website into `~/Projects/Claude/magnus-website`, and runs `npm install`. Takes about 8–10 minutes the first time, mostly Homebrew and `npm install`.
>
> When it finishes:
>
> - **Claude Desktop / Cowork:** create a new project, name it `magnus-website`, and choose `~/Projects/Claude/magnus-website` as the folder. Install the `magnus-site` plugin into that project, then start a chat.
> - **Claude Code CLI:** run `cd ~/Projects/Claude/magnus-website && claude`.
>
> Run `magnus-setup` again in that fresh session to confirm — you should see "You're in the magnus repo".

Stop after printing. Don't run any of those commands yourself; the install belongs in the user's Terminal, not the Claude session.

## Step 4 — If the user is already inside a partial clone (recovery)

If Step 2 detected an incomplete clone at the canonical path, tell the user:

> The repo at `~/Projects/Claude/magnus-website` is missing `<list of markers>`. From Terminal, run:
>
> ```bash
> cd ~/Projects/Claude/magnus-website && git pull && npm install
> ```
>
> Then re-open this Claude project in a fresh session.

Stop.

## Refusal templates

> I don't clone or install from inside the Claude session — Claude's working directory is fixed at session start, so even if I cloned correctly the rest of the skills wouldn't see it. The Terminal paste above is the single, canonical install. Run it once and you're set.

> I can't change the install path from this session. The canonical path is `~/Projects/Claude/magnus-website` — every doc, the helper MCP, and support all assume that. If you have a strong reason to put it elsewhere, do it manually and call `magnus_set_repo_path` from the helper afterwards.
