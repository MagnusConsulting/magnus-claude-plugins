---
name: magnus-publish
description: Publish accumulated changes to the Magnus Consulting website by validating, building, committing to a feature branch, pushing, and opening a pull request on GitHub. Use when the user says "publish", "ship it", "open a PR", "deploy this", or "publish the changes". Reads .magnus-changes/pending.log to compose the commit message and PR body so every approval recorded by other skills travels with the change. Refuses to push to main — branch protection plus this skill's logic ensure every change goes through PR review before deploy. NOT for editing or creating content (use the magnus-edit-* / magnus-add-* skills).
---

# Magnus — Publish

You are publishing accumulated working-tree changes to GitHub as a pull request. The skill never pushes to `main`. Every change goes onto a feature branch, opens a PR, and waits for human review before the deploy webhook fires.

## Step 1 — Confirm working directory is the magnus repo

Verify all three are present:

- `package.json` with `astro` in dependencies
- `src/pages/`
- `docs/llm-context.md`

If any are missing, the working directory isn't the magnus repo. Stop and offer to run **magnus-setup** or have the user `cd` correctly.

## Step 2 — Confirm there are changes to publish

Run `git status --porcelain`. If output is empty, tell the user there's nothing to publish and stop.

If output exists, run `git status` (regular) and read it back to the user — they should see what's about to ship before you go further.

## Step 3 — Read the audit log

Read `.magnus-changes/pending.log` if it exists. Each line is one gated change with timestamp, file, summary, and approver. You'll embed these in the commit message and PR body.

If the file doesn't exist or is empty, that means no gated changes were made — only routine edits. That's fine; the publish proceeds without an embedded audit section.

## Step 4 — Pre-flight validation

Run two checks in sequence:

1. **`npx astro check 2>&1 | tail -20`** — refuse to proceed on any error in the new code. Pre-existing warnings are fine.
2. **`npm run build 2>&1 | tail -30`** — refuse to proceed if the build fails.

If either fails, tell the user exactly what failed (paste the relevant tail), do not commit, and offer to roll back the offending change. Don't try to fix the failure yourself unless the user asks — that's a separate workflow.

## Step 5 — Branch handling

Run `git branch --show-current` to find the current branch.

- **On `main`** — never commit here. Create a new feature branch:
  - Default name: `change/<short-topic>-<yymmdd>` where `<short-topic>` is a 3–5 word kebab-case summary of the changes (e.g. `team-page-update`, `dhl-metric-correction`, `feb-insights-batch`) and `<yymmdd>` is today's date.
  - Confirm the branch name with the user before creating.
  - `git checkout -b <branch>`
- **On a feature branch already** — use it. Don't create a new one. Just confirm with the user that this is the branch they want.

If the branch already has an open PR (check `gh pr list --head <branch> --json number,url`), warn the user — additional commits will be added to that PR rather than a new one.

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

## Step 7 — Push the branch

`git push -u origin <branch>` (the `-u` sets the upstream tracking so future pushes from this branch are simple).

If push fails because the remote rejected it (branch protection, missing permissions), tell the user verbatim and stop. Don't retry with `--force`.

## Step 8 — Open the pull request

Run `gh pr create` with:

- `--base main` — explicit, never another base
- `--title <commit title>` — same as the commit title
- `--body` via heredoc — contains the same Changes / Approvals sections as the commit, plus a top-level test-plan checklist

PR body template:

```
## Summary

<one-paragraph description, same as commit body>

## Changes

- <bullet from audit log line 1>
- <bullet from audit log line 2>

## Approvals

- <approver from log line 1>
- <approver from log line 2>

## Test plan

- [ ] Preview the changed pages on the deployed branch (or in dev if branch previews aren't configured)
- [ ] Verify gated approvals correspond to the named approvers
- [ ] Confirm no design-system regressions on changed pages

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

If `gh` returns a PR URL, capture it. If `gh` errors, paste the error verbatim and stop.

## Step 9 — Truncate the audit log

Once the PR is open, the audit log has fulfilled its purpose. Truncate `.magnus-changes/pending.log` so the next batch of changes starts fresh:

```bash
> .magnus-changes/pending.log
```

If the file is committed (it shouldn't be — it's gitignored — but verify), don't truncate; the gitignore handles it.

## Step 10 — Hand off

Reply with one short message containing the PR URL:

> Branch `<branch>` pushed. PR open at `<PR URL>` — `<N>` changes, `<M>` approvals embedded. Once a reviewer merges, the deploy webhook fires and the site is live. The audit log has been truncated for the next batch.

Don't merge the PR yourself. Don't comment on it. Don't add reviewers. The reviewer is whoever Magnus designates for site changes — usually a partner or the build team.

## Refusal templates

> No changes to publish — `git status` is clean. Make some edits via the magnus-edit-* / magnus-add-* skills first, then re-run.

> The build failed (or `astro check` reported errors). Here's the tail of the output:
>
> `<paste>`
>
> Fix the issue first or roll back the change. I won't commit broken code.

> You're on `main`. I never push directly to `main` — branch protection plus this skill's logic make sure every change goes through a PR. Want me to create a new branch named `<suggested>` for these changes?

> The remote rejected the push. The error was:
>
> `<paste>`
>
> This usually means branch protection or missing permissions. Sort the auth (typically `gh auth login`) and re-run, or hand the branch off to someone with push access.

> The branch `<branch>` already has open PR `<existing URL>`. Adding another commit will append to that PR rather than opening a new one. Continue, or pick a different branch name?

> I noticed staged files that look sensitive (`<list>`). Refusing to commit those. Either remove them from the working tree or tell me explicitly which to drop from the commit.
