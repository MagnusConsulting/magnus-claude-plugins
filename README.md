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
| `magnus-edit-page` | Edit copy, headings, CTAs, SEO, or component props on an existing page. Refuses off-system changes. Enforces approval gates on legal pages, growth stories, the homepage hero, and any client metric. |

More skills land here as they're built (`magnus-add-insight-article`, `magnus-add-growth-story`, `magnus-publish`, etc.).

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
