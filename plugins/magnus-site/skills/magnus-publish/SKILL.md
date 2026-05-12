---
name: magnus-publish
description: Publish accumulated changes to the Magnus Consulting website by validating, building, committing to the `staging` branch, and pushing. Use when the user says "publish", "ship it", "deploy this", "push to staging", or "publish the changes". Reads .magnus-changes/pending.log to compose the commit message so every approval recorded by other skills travels with the change. Pushes directly to origin/staging — CI auto-deploys staging.magnusconsulting.co.uk on push. Refuses to operate on any branch other than `staging`. NOT for editing or creating content (use the magnus-edit-* / magnus-add-* skills).
---

# Magnus — Publish

You are publishing accumulated working-tree changes to GitHub by committing to the `staging` branch and pushing. CI is wired to the `staging` branch — every successful push auto-deploys to **https://staging.magnusconsulting.co.uk**, which is the live site as far as Magnus admins are concerned.

This skill only ever operates on `staging`. There is no feature-branch / PR / reviewer-merge step — that's a separate, manual process owned by the build team if and when staging is promoted further.

## Step 1 — Confirm working directory is the magnus repo

Verify all three are present:

- `package.json` with `astro` in dependencies
- `src/pages/`
- `docs/llm-context.md`

If any are missing, the working directory isn't the magnus repo. Stop and offer to run **magnus-setup** or have the user `cd` correctly.

## Step 2 — Confirm we're on `staging`

Run `git branch --show-current`.

- **On `staging`** → continue.
- **On any other branch** (including `main`) → refuse. Don't auto-switch — the user may have local work on that branch they don't want to lose. Tell them:

  > I only publish from `staging` — that's the branch CI deploys to staging.magnusconsulting.co.uk. You're on `<branch>`. Switch with `git checkout staging` (or `git stash` first if you have local changes you want to keep), then re-run **magnus-publish**.

  Stop.

## Step 3 — Confirm there are changes to publish

Run `git status --porcelain`. If output is empty, tell the user there's nothing to publish and stop.

If output exists, run `git status` (regular) and read it back to the user — they should see what's about to ship before you go further.

## Step 4 — Read the audit log

Read `.magnus-changes/pending.log` if it exists. Each line is one gated change with timestamp, file, summary, and approver. You'll embed these in the commit message.

If the file doesn't exist or is empty, that means no gated changes were made — only routine edits. That's fine; the publish proceeds without an embedded audit section.

## Step 5 — Pre-flight validation

Validation **must** run on the user's Mac, not in the Cowork sandbox. Cowork is Linux ARM64; the magnus repo's `node_modules` is macOS-installed; native binaries (rollup, sharp) are platform-specific. `npm run build` from inside a Cowork Bash will always fail with `@rollup/rollup-linux-* not found` even though the build is perfectly fine on the Mac.

### Step 5a — Prefer `magnus_validate` (works in every context)

Call the `magnus_validate` MCP tool. It runs `npm run build` (and `npx astro check` if installed) on the user's Mac via the local helper and returns:

```
{
  repoPath: "/Users/.../magnus",
  passed: true | false,
  build:      { status: "ok" | "failed", output: "<tail>" },
  astroCheck: { status: "ok" | "failed" | "skipped", output: "<tail>" }
}
```

**If `passed: true`** → proceed to Step 6.

**If `passed: false`** → stop immediately. Paste the failing tail to the user verbatim. Refuse to commit. Offer to roll back the offending change. **Do not negotiate around the gate** — even if "the dev server is running fine" or "the change looks trivially correct". The build is the gate; if the build fails, the change doesn't ship.

### Step 5b — Fallback (no helper, e.g. Claude Code in a terminal off the helper)

If `magnus_validate` errors with "tool not available", you're in a context with direct Bash access to the user's machine. Run the same commands manually:

1. **`npx astro check 2>&1 | tail -20`** — refuse on any error in new code. Pre-existing warnings are fine.
2. **`npm run build 2>&1 | tail -30`** — refuse if the build fails.

### Never bypass

In Cowork, do NOT run `npm run build` via the sandbox Bash. It will always fail and you'll be tempted to rationalise around it. The correct response to a sandbox-side failure is **not** "the change looks fine, let me commit anyway" — it's "the sandbox can't validate; use `magnus_validate` to validate on the Mac". If `magnus_validate` isn't available and Bash validation fails, stop and tell the user. **A failing gate is a gate, not a suggestion.**

## Step 6 — Stage and commit

**Never `git add -A` or `git add .`.** Stage only files that the skill chain has touched. Look at `git status --porcelain` and stage:

- Files under `src/pages/`, `src/data/`, `src/components/`, `src/content/` that were modified or added
- `docs/llm-context.md` if modified
- `.gitignore` if a skill added an entry
- `.claude/launch.json` if `magnus-preview` created it
- `public/` files only if they're explicitly part of an admin asset upload

**Refuse to stage:**

- `.env`, `.env.*` — secrets
- Files matching `*credentials*`, `*secret*`, `*token*`, `*.key`, `*.pem`
- `node_modules/`
- `.magnus-changes/` — that's gitignored anyway, but explicit refusal is good

Tell the user the staged file list before committing. Wait for explicit yes if anything looks wrong.

**Commit message format:**

```
<short title — imperative, under 70 chars>

<one paragraph describing what changed and why, max 5 lines>

Changes:
- <bullet from audit log line 1, file path + summary>
- <bullet from audit log line 2>
- <…or "Routine edits — no gated changes" if pending.log was empty>

Approvals:
- <approver from log line 1>
- <approver from log line 2>
- <…or "n/a — no gated changes" if pending.log was empty>
```

Use `HEREDOC` to pass the message to `git commit -m`. Do NOT use `--no-verify` or `--no-gpg-sign` (let pre-commit hooks run normally — if they fail, fix the issue and commit again rather than skipping).

## Step 7 — Sync with remote staging

`staging` is a shared branch — someone else may have pushed since you last pulled. Run:

```bash
git pull --rebase origin staging
```

- **Clean rebase** → continue to Step 8.
- **Conflicts** → stop. Don't try to resolve them automatically. Paste the conflicted file list verbatim and tell the user:

  > Rebase onto `origin/staging` hit conflicts in `<files>`. Resolve them in the editor, then run `git rebase --continue` (or `git rebase --abort` to back out), then re-run **magnus-publish**.

## Step 8 — Push to staging

```bash
git push origin staging
```

If push fails because the remote rejected it (auth, permissions, or the remote moved again between Step 7 and now), tell the user verbatim and stop. Don't retry with `--force`.

## Step 9 — Truncate the audit log

Once the push has succeeded, the audit log has fulfilled its purpose. Truncate `.magnus-changes/pending.log` so the next batch of changes starts fresh:

```bash
> .magnus-changes/pending.log
```

If the file is committed (it shouldn't be — it's gitignored — but verify), don't truncate; the gitignore handles it.

## Step 10 — Hand off

Reply with one short message:

> Pushed to `staging`. CI will deploy to **https://staging.magnusconsulting.co.uk** in a minute or two. `<N>` changes, `<M>` approvals embedded in the commit. The audit log has been truncated for the next batch.

Don't open the staging URL yourself — let the user check it when CI's done.

## Refusal templates

> No changes to publish — `git status` is clean. Make some edits via the magnus-edit-* / magnus-add-* skills first, then re-run.

> The build failed (or `astro check` reported errors). Here's the tail of the output:
>
> `<paste>`
>
> Fix the issue first or roll back the change. I won't commit broken code.

> You're on `<branch>`, not `staging`. I only publish from `staging` — that's the branch CI deploys to staging.magnusconsulting.co.uk. Run `git checkout staging` (stash local work first if you need to keep it) and re-run **magnus-publish**.

> Rebase onto `origin/staging` hit conflicts in `<files>`. Resolve them, run `git rebase --continue`, then re-run **magnus-publish**.

> The remote rejected the push. The error was:
>
> `<paste>`
>
> This usually means auth or permissions. Sort the auth (typically `gh auth login`) and re-run, or hand off to someone with push access to `staging`.

> I noticed staged files that look sensitive (`<list>`). Refusing to commit those. Either remove them from the working tree or tell me explicitly which to drop from the commit.
