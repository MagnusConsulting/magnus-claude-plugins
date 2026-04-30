# magnus-claude-plugins

A private Claude Code plugin marketplace for administering the Magnus Consulting website.

## Install

In any Claude Code session:

```
/plugin marketplace add ssu96ld/magnus-claude-plugins
/plugin install magnus-site
```

You will need GitHub access to this repo (`gh auth login` first if you haven't).

## What's in it

### Plugin: `magnus-site`

Skills that let non-technical admins create and edit pages on the Magnus Consulting Astro site without breaking the design system, component library, or brand voice rules.

| Skill | Purpose |
|---|---|
| `magnus-setup` | Bootstrap the magnus website repo so the other skills can run. Clones `ssu96ld/magnusconsulting-co-uk` into the current folder, accepts a path to an existing clone, or hands off cleanly so the user can `cd` themselves. Runs `npm install` after cloning. |
| `magnus-edit-page` | Edit copy, headings, CTAs, SEO, or component props on an existing page. Refuses off-system changes. Enforces approval gates on legal pages, growth stories, the homepage hero, and any client metric. Auto-navigates the live preview pane to the edited page. |
| `magnus-add-insight-article` | Create a new article under `/insights/<slug>`. Generates the full page from the canonical template and inserts a matching `ArticleCard` at the top of the `/insights` grid. Enforces the four documented categories, the four known authors, and a content sign-off gate. Auto-navigates the live preview pane to the new article. |
| `magnus-preview` | Start, navigate, or stop the local Astro dev server. Tries the Claude Desktop preview pane first; falls back to the system default browser when the preview MCP isn't wired (e.g. Cowork). Other skills call this after applying changes so the admin sees results in real time. |

If you're not in the magnus repo, every skill will offer to invoke `magnus-setup` rather than failing silently.

More skills land here as they're built (`magnus-add-growth-story`, `magnus-add-report`, `magnus-add-team-member`, `magnus-publish`, etc.).

### Prototype: `magnus-helper` MCP

This release ships a tiny local MCP server (`plugins/magnus-site/helper/echo-mcp.js`) that the plugin auto-starts on enable, declared in `plugins/magnus-site/.mcp.json`. It currently exposes a single diagnostic tool — `magnus_helper_ping` — which returns the host's environment so we can confirm the helper actually runs on the user's Mac (and is reachable from a Claude Cowork sandbox) before building out the real `magnus_dev_start` / `magnus_open_url` tools.

To test in Cowork:

1. `/plugin marketplace update magnus-claude-plugins`
2. `/reload-plugins` (or restart the session)
3. Run `/mcp` and confirm `magnus-helper` appears in the list.
4. Ask Claude: "Use the `magnus_helper_ping` tool and show me the output."

Expected: a JSON blob whose `hostname` matches your Mac's hostname (not a sandbox VM identifier), `platform: "darwin"`, `pluginRoot` resolved to the plugin's installed path, and `cwd` somewhere on your local filesystem. If those check out, the bridging works and we'll wire the real tools next.

## Live preview

The `magnus-preview` skill picks one of two mechanisms automatically based on what the current context supports:

- **Claude Desktop preview pane** (solo Desktop, Claude Code with the `Claude_Preview` MCP wired) — shows the running site in the right-hand pane. Uses `<magnus-repo>/.claude/launch.json` (created on first use, committed to the magnus repo).
- **System default browser** (Cowork or anywhere else `Claude_Preview` isn't wired) — starts `npm run dev` in the background and opens `http://localhost:4321<route>` in a separate browser window.

Astro hot module reloading keeps either preview in sync as you iterate.

When an edit or create skill applies a change, it checks for an existing preview pane session first; otherwise it asks once whether to spin up a preview, then delegates to `magnus-preview`, which handles the cascade.

## Required context

The skills assume you are running Claude in the `magnus` repo working directory and that `docs/llm-context.md` is present. That document is the source of truth for:

- The component library (`HeroSection`, `CtaSection`, `CsCard`, `StatCard`, …) and their props
- Design tokens (`--coral`, `--navy`, `--sp-*`, etc.)
- Page templates and conventions
- Magnus brand voice rules

If `docs/llm-context.md` is missing, the skills will refuse to edit.

## Approval gates

Some changes require an explicit `approved by <name>` line in chat before any edit is applied. The approval is recorded in `.magnus-changes/pending.log` in the website repo and travels with the change to publish.

Gated paths:

- `src/pages/privacy-policy.astro`
- `src/pages/terms-and-conditions.astro`
- `src/pages/cookie-policy.astro`
- `src/pages/modern-slavery-policy.astro`
- The `<HeroSection>` block on `src/pages/index.astro`
- Anything under `src/pages/impact/growth-story/`

Gated content (regardless of file):

- Client metrics on `CsCard`, `StatCard`, `CredentialCard`
- Real-money or percentage values attached to a client name
- Client names in quotes or attributions
- Testimonial quote text

## Development

```
magnus-claude-plugins/
  .claude-plugin/
    marketplace.json     # marketplace manifest, lists plugins
  plugins/
    magnus-site/
      .claude-plugin/
        plugin.json      # plugin manifest
      skills/
        magnus-edit-page/
          SKILL.md
  README.md
```

To work on the skill content while it's installed, edit the files under `~/.claude/plugins/marketplaces/magnus-claude-plugins/...` (where Claude Code clones the marketplace), or edit here and `git push`, then `/plugin marketplace update magnus-claude-plugins` in any session to pull changes.
